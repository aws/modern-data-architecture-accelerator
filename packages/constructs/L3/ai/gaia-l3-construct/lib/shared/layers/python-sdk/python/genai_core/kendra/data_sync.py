import os
import genai_core.types
import genai_core.workspaces
import genai_core.documents

from .client import get_kendra_client_for_index

DEFAULT_KENDRA_S3_DATA_SOURCE_ID = os.environ.get("DEFAULT_KENDRA_S3_DATA_SOURCE_ID")


def start_kendra_data_sync(workspace_id: str):
    workspace = genai_core.workspaces.get_workspace(workspace_id=workspace_id)

    if not workspace:
        raise genai_core.types.CommonError(f"Workspace {workspace_id} not found")

    if workspace["engine"] != "kendra":
        raise genai_core.types.CommonError(
            f"Workspace {workspace_id} is not a kendra workspace"
        )

    if workspace["kendra_index_external"]:
        raise genai_core.types.CommonError(
            f"Workspace {workspace_id} is an external kendra workspace"
        )

    kendra_index_id = workspace["kendra_index_id"]
    kendra = get_kendra_client_for_index(kendra_index_id)

    response = kendra.start_data_source_sync_job(
        Id=DEFAULT_KENDRA_S3_DATA_SOURCE_ID, IndexId=kendra_index_id
    )

    print(response)


def kendra_is_syncing(workspace_id: str):
    workspace = genai_core.workspaces.get_workspace(workspace_id=workspace_id)

    if not workspace:
        raise genai_core.types.CommonError(f"Workspace {workspace_id} not found")

    if workspace["engine"] != "kendra":
        raise genai_core.types.CommonError(
            f"Workspace {workspace_id} is not a kendra workspace"
        )

    if workspace["kendra_index_external"]:
        return False

    kendra_index_id = workspace["kendra_index_id"]
    kendra = get_kendra_client_for_index(kendra_index_id)

    response = kendra.list_data_source_sync_jobs(
        IndexId=kendra_index_id, Id=DEFAULT_KENDRA_S3_DATA_SOURCE_ID, MaxResults=5
    )

    ret_value = False
    for item in response["History"]:
        status = item["Status"]

        if status == "SYNCING" or status == "SYNCING_INDEXING":
            ret_value = True
            break

    return ret_value


def update_dynamodb_documents_table(workspace_id: str):
    workspace = genai_core.workspaces.get_workspace(workspace_id=workspace_id)

    if not workspace:
        raise genai_core.types.CommonError(f"Workspace {workspace_id} not found")

    if workspace["engine"] != "kendra":
        raise genai_core.types.CommonError(
            f"Workspace {workspace_id} is not a kendra workspace"
        )

    kendra_index_id = workspace["kendra_index_id"]
    kendra = get_kendra_client_for_index(kendra_index_id)

    response = kendra.query(
        IndexId=kendra_index_id,
        AttributeFilter={
            "EqualsTo": {
                "Key": "_language_code",
                "Value": {
                    "StringValue": "en"
                }
            }
        },
        SortingConfiguration={
            "DocumentAttributeKey": "_created_at",
            "SortOrder": "DESC"})

    for item in response["ResultItems"]:
        document_request = _convert_kendra_index_browse_to_document_create_object(item)
        existing = genai_core.documents.get_document(workspace_id, document_request['id'])
        if not existing:
            print(document_request)
            genai_core.documents.create_document(
                workspace_id=workspace_id,
                document_type=document_request['type'],
                title=document_request['title'],
                path=document_request['path'],
                document_id=document_request['id']
            )


def _convert_kendra_index_browse_to_document_create_object(result: any):
    document_id_pieces = result['DocumentId'].split("/")
    return {
        "id": document_id_pieces[-2],
        "title": f'{document_id_pieces[-3]}-{document_id_pieces[-2]}',
        "type": "kendra_doc",
        "path": result['DocumentURI'],
    }
