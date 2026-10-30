"""
Tests for the M2M API presigned URL Lambda: where each flow puts the object, and how caller-supplied
sub_path and filename values are validated.
"""

import json

import pytest
from botocore.exceptions import ClientError

import s3_url
from conftest import UPLOAD_ID, make_event

MD5 = "1B2M2Y8AsgTpgAmY7PhCfg=="
CALLER_UUID = "3f2b7c1e-8d4a-4b6f-9e2a-1c5d7f9a0b3e"
SUB_PATH = "source-a/device-7/year=2026/month=10"
FILENAME = "capture-0042.parquet"

# The query parameters each flow requires, without sub_path or filename.
FLOW_PARAMS = {
    "unipart": {"md5": MD5},
    "multi_init": {},
    "multi_upload": {"md5": MD5, "uuid": CALLER_UUID, "part_num": "1", "upload_id": UPLOAD_ID},
    "multi_complete": {"uuid": CALLER_UUID, "upload_id": UPLOAD_ID},
}
FLOWS = list(FLOW_PARAMS)

INVALID_SUB_PATHS = [
    "",
    "/source-a",
    "source-a/",
    "source-a//device-7",
    ".",
    "..",
    "source-a/../escape",
    "source-a/./device-7",
    "source a",
    "source-a/device?7",
    "source-a/device#7",
    "source-a\\device-7",
    "source-a\n",
    "source-a/d\u00e9vice-7",
    "%2e%2e",
]
INVALID_FILENAMES = [
    "",
    ".",
    "..",
    "dir/capture.parquet",
    "capture 0042.parquet",
    "capture\x00.parquet",
    "capture&0042.parquet",
    "caf\u00e9.parquet",
]
# multi_upload and multi_complete build the key from the caller's uuid.
CALLER_UUID_FLOWS = ["multi_upload", "multi_complete"]
INVALID_UUIDS = [
    "",
    CALLER_UUID.upper(),
    CALLER_UUID.replace("-", ""),
    f"{{{CALLER_UUID}}}",
    f"{CALLER_UUID}0",
    f"../{CALLER_UUID}",
    f"source-b/{CALLER_UUID}",
    pytest.param("a" * 1024, id="a*1024"),
]


def call(flow, **params):
    response = s3_url.handler(make_event(flow, **params), None)
    return response["statusCode"], json.loads(response["body"])


def addressed_key(flow, s3):
    """The object key the flow's S3 call addressed."""
    if flow == "multi_init":
        return s3.create_multipart_upload.call_args.kwargs["Key"]
    if flow == "multi_complete":
        return s3.complete_multipart_upload.call_args.kwargs["Key"]
    return s3.generate_presigned_url.call_args.kwargs["Params"]["Key"]


def metadata_written(s3):
    """The key and body of the metadata object the flow wrote."""
    kwargs = s3.put_object.call_args.kwargs
    return kwargs["Key"], json.loads(kwargs["Body"])


def response_uuid(body):
    # multi_complete does not return the uuid; the multipart flows use the caller's.
    return body.get("uuid", CALLER_UUID)


class TestFlagOff:
    @pytest.mark.parametrize("flow", FLOWS)
    def test_parameters_are_ignored(self, s3, flow):
        status, body = call(flow, **FLOW_PARAMS[flow], sub_path=SUB_PATH, filename=FILENAME)

        assert status == 200
        assert addressed_key(flow, s3) == f"testing/{response_uuid(body)}"
        assert "object_key" not in body

    @pytest.mark.parametrize("flow", FLOWS)
    def test_invalid_parameters_are_not_rejected(self, s3, flow):
        status, _ = call(flow, **FLOW_PARAMS[flow], sub_path="../escape", filename="..")

        assert status == 200
        assert addressed_key(flow, s3).startswith("testing/")

    @pytest.mark.parametrize("flow", CALLER_UUID_FLOWS)
    def test_invalid_uuid_is_not_rejected(self, s3, flow):
        status, _ = call(flow, **{**FLOW_PARAMS[flow], "uuid": f"source-b/{CALLER_UUID}"})

        assert status == 200
        assert addressed_key(flow, s3) == f"testing/source-b/{CALLER_UUID}"

    @pytest.mark.parametrize("flow", ["unipart", "multi_init"])
    def test_metadata_body_is_unchanged(self, s3, flow):
        call(flow, **FLOW_PARAMS[flow])
        _, without_parameters = metadata_written(s3)
        call(flow, **FLOW_PARAMS[flow], sub_path=SUB_PATH, filename=FILENAME)
        _, with_parameters = metadata_written(s3)

        assert with_parameters == without_parameters
        assert "object_key" not in with_parameters


@pytest.mark.usefixtures("caller_key_path")
class TestFlagOnWithoutParameters:
    @pytest.mark.parametrize("flow", FLOWS)
    def test_key_is_unchanged(self, s3, flow):
        status, body = call(flow, **FLOW_PARAMS[flow])

        assert status == 200
        assert addressed_key(flow, s3) == f"testing/{response_uuid(body)}"
        assert "object_key" not in body

    def test_unipart_response_and_metadata_are_unchanged(self, s3):
        _, body = call("unipart", **FLOW_PARAMS["unipart"])
        metadata_key, metadata = metadata_written(s3)

        assert set(body) == {"url", "uuid"}
        assert metadata_key == f"metadata-testing/{body['uuid']}.metadata.json"
        assert metadata == {"RequestTime": "26/Oct/2026:12:00:00 +0000"}

    def test_multi_init_response_and_metadata_have_no_object_key(self, s3):
        _, body = call("multi_init")
        _, metadata = metadata_written(s3)

        assert set(body) == {"uuid", "upload_id"}
        assert "object_key" not in metadata


@pytest.mark.usefixtures("caller_key_path")
class TestKeyFormat:
    @pytest.mark.parametrize(
        "params, expected",
        [
            ({"sub_path": SUB_PATH}, f"testing/{SUB_PATH}/{{uuid}}"),
            ({"filename": FILENAME}, f"testing/{{uuid}}_{FILENAME}"),
            ({"sub_path": SUB_PATH, "filename": FILENAME}, f"testing/{SUB_PATH}/{{uuid}}_{FILENAME}"),
        ],
    )
    def test_key_matches_format(self, s3, params, expected):
        status, body = call("unipart", md5=MD5, **params)

        assert status == 200
        assert addressed_key("unipart", s3) == expected.format(uuid=body["uuid"])

    def test_unipart_returns_and_records_key(self, s3):
        _, body = call("unipart", md5=MD5, sub_path=SUB_PATH, filename=FILENAME)
        expected = f"testing/{SUB_PATH}/{body['uuid']}_{FILENAME}"
        metadata_key, metadata = metadata_written(s3)

        assert addressed_key("unipart", s3) == expected
        assert body["object_key"] == expected
        assert metadata_key == f"metadata-testing/{body['uuid']}.metadata.json"
        assert metadata["object_key"] == expected

    def test_multipart_flows_address_the_same_key(self, s3):
        params = {"sub_path": SUB_PATH, "filename": FILENAME}
        _, init = call("multi_init", **params)
        init_key = addressed_key("multi_init", s3)
        _, metadata = metadata_written(s3)
        call("multi_upload", md5=MD5, uuid=init["uuid"], part_num="1", upload_id=init["upload_id"], **params)
        upload_key = addressed_key("multi_upload", s3)
        status, _ = call("multi_complete", uuid=init["uuid"], upload_id=init["upload_id"], **params)
        complete_key = addressed_key("multi_complete", s3)

        assert status == 200
        assert init["object_key"] == f"testing/{SUB_PATH}/{init['uuid']}_{FILENAME}"
        assert metadata["object_key"] == init["object_key"]
        assert init_key == upload_key == complete_key == init["object_key"]
        s3.resource.MultipartUpload.assert_called_with("test-bucket", init["object_key"], init["upload_id"])

    def test_multi_complete_for_an_upload_at_another_key_returns_400(self, s3):
        s3.resource.MultipartUpload.return_value.parts.all.side_effect = ClientError(
            {"Error": {"Code": "NoSuchUpload", "Message": "The specified upload does not exist."}}, "ListParts"
        )

        status, _ = call("multi_complete", **FLOW_PARAMS["multi_complete"], sub_path="source-b")

        assert status == 400
        s3.complete_multipart_upload.assert_not_called()

    def test_uploads_with_the_same_parameters_get_different_keys(self, s3):
        call("unipart", md5=MD5, sub_path=SUB_PATH, filename=FILENAME)
        first = addressed_key("unipart", s3)
        call("unipart", md5=MD5, sub_path=SUB_PATH, filename=FILENAME)
        second = addressed_key("unipart", s3)

        assert first != second

    def test_every_safe_character_is_accepted(self, s3):
        characters = "AZaz09!-_.*'()="

        status, body = call("unipart", md5=MD5, sub_path=f"{characters}/x", filename=f"{characters}.csv")

        assert status == 200
        assert body["object_key"] == f"testing/{characters}/x/{body['uuid']}_{characters}.csv"

    def test_key_at_the_s3_limit_is_accepted(self, s3):
        fixed_length = len(f"testing//{CALLER_UUID}_f")

        status, body = call("unipart", md5=MD5, sub_path="a" * (1024 - fixed_length), filename="f")

        assert status == 200
        assert len(body["object_key"].encode("utf-8")) == 1024


@pytest.mark.usefixtures("caller_key_path")
class TestValidation:
    @pytest.mark.parametrize("flow", FLOWS)
    @pytest.mark.parametrize("sub_path", INVALID_SUB_PATHS)
    def test_invalid_sub_path_is_rejected_before_any_s3_call(self, s3, flow, sub_path):
        status, body = call(flow, **FLOW_PARAMS[flow], sub_path=sub_path, filename=FILENAME)

        assert status == 400
        assert body["Error"].startswith("sub_path ")
        assert s3.mock_calls == []

    @pytest.mark.parametrize("flow", FLOWS)
    @pytest.mark.parametrize("filename", INVALID_FILENAMES)
    def test_invalid_filename_is_rejected_before_any_s3_call(self, s3, flow, filename):
        status, body = call(flow, **FLOW_PARAMS[flow], sub_path=SUB_PATH, filename=filename)

        assert status == 400
        assert body["Error"].startswith("filename ")
        assert s3.mock_calls == []

    @pytest.mark.parametrize("flow", FLOWS)
    @pytest.mark.parametrize(
        "params",
        [
            {"sub_path": "a" * (1024 - len(f"testing//{CALLER_UUID}_f") + 1), "filename": "f"},
            {"filename": "a" * (1024 - len(f"testing/{CALLER_UUID}_") + 1)},
        ],
        ids=["sub_path", "filename"],
    )
    def test_key_over_the_s3_limit_is_rejected_before_any_s3_call(self, s3, flow, params):
        status, body = call(flow, **FLOW_PARAMS[flow], **params)

        assert status == 400
        assert "1024 bytes" in body["Error"]
        assert s3.mock_calls == []

    @pytest.mark.parametrize("flow", CALLER_UUID_FLOWS)
    @pytest.mark.parametrize("key_path", [{}, {"sub_path": SUB_PATH, "filename": FILENAME}], ids=["without", "with"])
    @pytest.mark.parametrize("uuid", INVALID_UUIDS)
    def test_invalid_uuid_is_rejected_before_any_s3_call(self, s3, flow, key_path, uuid):
        status, body = call(flow, **{**FLOW_PARAMS[flow], "uuid": uuid}, **key_path)

        assert status == 400
        assert body["Error"].startswith("uuid ")
        assert s3.mock_calls == []

    @pytest.mark.parametrize("flow", CALLER_UUID_FLOWS)
    def test_missing_uuid_is_rejected_before_any_s3_call(self, s3, flow):
        params = {name: value for name, value in FLOW_PARAMS[flow].items() if name != "uuid"}

        status, body = call(flow, **params, sub_path=SUB_PATH)

        assert status == 400
        assert body["Error"].startswith("uuid ")
        assert s3.mock_calls == []


class TestPresignedUrlSignature:
    """Uses the function's own S3 client rather than the mock: S3 refuses SigV2-signed uploads of objects
    encrypted with KMS, so a URL signed any other way than SigV4 fails at S3 however its key was built."""

    @pytest.mark.parametrize(
        "client_method, params",
        [
            ("put_object", {"Bucket": "test-bucket", "Key": "testing/key", "ContentMD5": MD5}),
            (
                "upload_part",
                {"Bucket": "test-bucket", "Key": "testing/key", "UploadId": UPLOAD_ID, "PartNumber": 1, "ContentMD5": MD5},
            ),
        ],
    )
    def test_presigned_urls_are_signed_with_sigv4(self, client_method, params):
        url = s3_url.s3.generate_presigned_url(client_method, Params=params, ExpiresIn=600)

        assert "X-Amz-Algorithm=AWS4-HMAC-SHA256" in url
