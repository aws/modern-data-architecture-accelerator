import os
import json
import boto3
import genai_core.types
import genai_core.chunks
import genai_core.documents
import genai_core.workspaces
import genai_core.aurora.create
from langchain.document_loaders import S3FileLoader

WORKSPACE_ID = os.environ.get("WORKSPACE_ID")
DOCUMENT_ID = os.environ.get("DOCUMENT_ID")
INPUT_BUCKET_NAME = os.environ.get("INPUT_BUCKET_NAME")
INPUT_OBJECT_KEY = os.environ.get("INPUT_OBJECT_KEY")
PROCESSING_BUCKET_NAME = os.environ.get("PROCESSING_BUCKET_NAME")
PROCESSING_OBJECT_KEY = os.environ.get("PROCESSING_OBJECT_KEY")

s3_client = boto3.client("s3")


def main():
    print("Starting file converter batch job")
    print("Workspace ID: {}".format(WORKSPACE_ID))
    print("Document ID: {}".format(DOCUMENT_ID))
    print("Input bucket name: {}".format(INPUT_BUCKET_NAME))
    print("Input object key: {}".format(INPUT_OBJECT_KEY))
    print("Output bucket name: {}".format(PROCESSING_BUCKET_NAME))
    print("Output object key: {}".format(PROCESSING_OBJECT_KEY))

    workspace = genai_core.workspaces.get_workspace(WORKSPACE_ID)
    if not workspace:
        raise genai_core.types.CommonError(f"Workspace {WORKSPACE_ID} does not exist")

    document = genai_core.documents.get_document(WORKSPACE_ID, DOCUMENT_ID)
    if not document:
        raise genai_core.types.CommonError(
            f"Document {WORKSPACE_ID}/{DOCUMENT_ID} does not exist"
        )

    try:
        extension = os.path.splitext(INPUT_OBJECT_KEY)[-1].lower()
        if extension == ".txt":
            object = s3_client.get_object(
                Bucket=INPUT_BUCKET_NAME, Key=INPUT_OBJECT_KEY
            )
            content = object["Body"].read().decode("utf-8")
            if (
                INPUT_BUCKET_NAME != PROCESSING_BUCKET_NAME
                and INPUT_OBJECT_KEY != PROCESSING_OBJECT_KEY
            ):
                s3_client.put_object(
                    Bucket=PROCESSING_BUCKET_NAME, Key=PROCESSING_OBJECT_KEY, Body=content
                )

            add_chunks(workspace, document, content)
        elif extension == ".json" and "frequently-asked-questions" in INPUT_OBJECT_KEY:
            object = s3_client.get_object(
                Bucket=INPUT_BUCKET_NAME, Key=INPUT_OBJECT_KEY
            )
            content = object["Body"].read().decode("utf-8")
            content = json.loads(content)
            existing_faq_map = genai_core.documents.get_redirection_text_documents_map(WORKSPACE_ID)
            for key, value in content.items():
                question = key
                response = value
                existing_id = existing_faq_map.get(question.lower())
                if not existing_id:
                    result = genai_core.documents.create_document(
                        workspace_id=WORKSPACE_ID,
                        document_type="qna",
                        document_sub_type="redirection",
                        title=question,
                        content=question,
                        content_complement=response,
                    )
                else:
                    result = genai_core.documents.create_document(
                        workspace_id=WORKSPACE_ID,
                        document_type="qna",
                        document_sub_type="redirection",
                        title=question,
                        content=question,
                        content_complement=response,
                        document_id=existing_id
                    )
                genai_core.documents.set_status(
                    result.get('workspace_id'), result.get("document_id"), "processed"
                )
        else:
            loader = S3FileLoader(INPUT_BUCKET_NAME, INPUT_OBJECT_KEY)
            print(f"loader: {loader}")
            docs = loader.load()
            content = docs[0].page_content

            if (
                INPUT_BUCKET_NAME != PROCESSING_BUCKET_NAME
                and INPUT_OBJECT_KEY != PROCESSING_OBJECT_KEY
            ):
                s3_client.put_object(
                    Bucket=PROCESSING_BUCKET_NAME, Key=PROCESSING_OBJECT_KEY, Body=content
                )

            add_chunks(workspace, document, content)
    except Exception as error:
        genai_core.documents.set_status(WORKSPACE_ID, DOCUMENT_ID, "error")
        print(error)
        raise error


def add_chunks(workspace: dict, document: dict, content: str):
    chunks = genai_core.chunks.split_content(workspace, content)

    genai_core.chunks.add_chunks(
        workspace=workspace,
        document=document,
        document_sub_id=None,
        chunks=chunks,
        chunk_complements=None,
        replace=True,
    )


if __name__ == "__main__":
    main()
