import os
from typing import Optional

import genai_core.types
import genai_core.upload
import genai_core.documents
from pydantic import BaseModel, HttpUrl, Field
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router

tracer = Tracer()
router = Router()
logger = Logger()


class FileUploadRequest(BaseModel):
    fileName: str = Field(min_length=1, max_length=200,  pattern=r"^[\w,\s-]+\.[\w]+$")


class TextDocumentRequest(BaseModel):
    title: str = Field(min_length=1, max_length=1000)
    content: str = Field(min_length=1, max_length=10000)


class QnADocumentRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    answer: str = Field(min_length=1, max_length=1000)


class WebsiteDocumentRequest(BaseModel):
    sitemap: bool
    address: HttpUrl
    followLinks: bool
    limit: int


class TextDocumentUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=1000)
    content: str = Field(min_length=1, max_length=10000)


class QnADocumentUpdateRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    answer: str = Field(min_length=1, max_length=1000)


class ApiSyncRequest(BaseModel):
    fullSync: Optional[bool] = False


allowed_extensions = set(
    [
        ".json",
        ".csv",
        ".doc",
        ".docx",
        ".epub",
        ".odt",
        ".pdf",
        ".ppt",
        ".pptx",
        ".tsv",
        ".xlsx",
        ".eml",
        ".html",
        ".json",
        ".md",
        ".msg",
        ".rst",
        ".rtf",
        ".txt",
        ".xml",
    ]
)


@router.post("/workspaces/<workspace_id>/documents/file-upload")
@tracer.capture_method
def file_upload(workspace_id: str):
    data: dict = router.current_event.json_body
    request = FileUploadRequest(**data)

    _, extension = os.path.splitext(request.fileName)
    if extension not in allowed_extensions:
        raise genai_core.types.CommonError("Invalid file extension")

    result = genai_core.upload.generate_presigned_post(workspace_id, request.fileName)

    return {"ok": True, "data": result}


@router.get("/workspaces/<workspace_id>/documents/<document_type>")
@tracer.capture_method
def get_documents(workspace_id: str, document_type: str):
    query_string = router.current_event.query_string_parameters or {}
    last_document_id = query_string.get("lastDocumentId", None)

    result = genai_core.documents.list_documents(
        workspace_id, document_type, last_document_id
    )

    return {
        "ok": True,
        "data": {
            "items": [_convert_document(item) for item in result["items"]],
            "lastDocumentId": result["last_document_id"],
        },
    }


@router.get("/workspaces/<workspace_id>/documents/<document_id>/details")
@tracer.capture_method
def get_document_details_with_content(workspace_id: str, document_id: str):
    result = genai_core.documents.get_document(workspace_id, document_id)
    content_results = genai_core.documents.get_document_content(
        workspace_id, document_id
    )

    return {
        "ok": True,
        "data": {
            **_convert_document(result),
            "content": content_results["content"],
            "contentComplement": content_results["content_complement"]
        },
    }


@router.post("/workspaces/<workspace_id>/documents/<document_type>")
@tracer.capture_method
def add_document(workspace_id: str, document_type: str):
    data: dict = router.current_event.json_body

    if document_type == "text":
        request = TextDocumentRequest(**data)
        result = genai_core.documents.create_document(
            workspace_id=workspace_id,
            document_type=document_type,
            title=request.title,
            content=request.content,
        )

        return {
            "ok": True,
            "data": {
                "workspaceId": result["workspace_id"],
                "documentId": result["document_id"],
            },
        }
    elif document_type == "qna":
        request = QnADocumentRequest(**data)
        request.question = request.question.strip()[:1000]
        request.answer = request.answer.strip()[:1000]
        result = genai_core.documents.create_document(
            workspace_id=workspace_id,
            document_type=document_type,
            document_sub_type="redirection",
            title=request.question,
            content=request.question,
            content_complement=request.answer,
        )

        return {
            "ok": True,
            "data": {
                "workspaceId": result["workspace_id"],
                "documentId": result["document_id"],
            },
        }
    elif document_type == "website":
        request = WebsiteDocumentRequest(**data)
        address_str = str(request.address)
        address_str = address_str.strip()[:10000]
        document_sub_type = "sitemap" if request.sitemap else None
        request.limit = min(max(request.limit, 1), 1000)

        result = genai_core.documents.create_document(
            workspace_id=workspace_id,
            document_type=document_type,
            document_sub_type=document_sub_type,
            path=address_str,
            crawler_properties={
                "follow_links": request.followLinks,
                "limit": request.limit,
            },
        )

        return {
            "ok": True,
            "data": {
                "workspaceId": result["workspace_id"],
                "documentId": result["document_id"],
            },
        }


@router.post("/workspaces/<workspace_id>/documents/dataset/sync")
@tracer.capture_method
def api_dataset_sync(workspace_id: str):
    existing_dataset_recorder = genai_core.documents.get_document(
        workspace_id, "api-processing-records"
    )
    if existing_dataset_recorder:
        status = existing_dataset_recorder.get("status")
        if status not in ["processed", "error"]:
            return {
                "ok": False,
                "data": {"workspaceId": workspace_id, "message": "Sync in progress"},
            }
    data: dict = router.current_event.json_body
    request = ApiSyncRequest(**data)
    genai_core.documents.trigger_ckan_sync(
        workspace_id=workspace_id, full_sync=request.fullSync
    )
    return {
        "ok": True,
        "data": {
            "workspaceId": workspace_id,
        },
    }


@router.get("/workspaces/<workspace_id>/documents/dataset/sync/status")
@tracer.capture_method
def check_if_api_sync_running_for_workspace(workspace_id: str):
    existing_dataset_recorder = genai_core.documents.get_document(
        workspace_id, "api-processing-records"
    )
    if existing_dataset_recorder:
        return {
            "ok": True,
            "data": {
                "workspaceId": workspace_id,
                "status": existing_dataset_recorder.get("status"),
                "totalDatasets": existing_dataset_recorder.get("total_datasets", 0),
                "processedDatasets": existing_dataset_recorder.get(
                    "processed_datasets", 0
                ),
            },
        }
    return {
        "ok": False,
        "data": {"message": "No sync processing record found"},
    }


@router.put("/workspaces/<workspace_id>/documents/<document_id>")
@tracer.capture_method
def update_document(workspace_id: str, document_id: str):
    data: dict = router.current_event.json_body
    document = genai_core.documents.get_document(workspace_id, document_id)
    if document is None:
        raise genai_core.types.CommonError("Document not found")
    document_type = document["document_type"]

    if document_type == "text":
        request = TextDocumentUpdateRequest(**data)
        request.title = request.title.strip()[:1000]
        genai_core.documents.update_document_content(
            workspace_id=workspace_id,
            document=document,
            title=request.title,
            content=request.content,
        )

        updated_document = genai_core.documents.get_document(
            workspace_id, document_id
        )

        return {"ok": True, "data": {
            **_convert_document(updated_document),
            "title": request.title,
            "content": request.content,
        }
                }
    elif document_type == "qna":
        request = QnADocumentUpdateRequest(**data)
        request.question = request.question.strip()[:1000]
        request.answer = request.answer.strip()[:1000]
        genai_core.documents.update_document_content(
            workspace_id=workspace_id,
            document=document,
            title=request.question,
            content=request.question,
            content_complement=request.answer
        )

        updated_document = genai_core.documents.get_document(
            workspace_id, document_id
        )

        return {"ok": True, "data": {
            **_convert_document(updated_document),
            "question": request.question,
            "answer": request.answer,
        }
                }


@router.delete("/workspaces/<workspace_id>/documents/<document_id>")
@tracer.capture_method
def delete_document(workspace_id: str, document_id: str):
    result = genai_core.documents.delete_document(workspace_id, document_id)
    return {"ok": True, "data": result}


def _convert_document(document: dict):
    return {
        "id": document["document_id"],
        "type": document["document_type"],
        "subType": document.get("document_sub_type", ""),
        "status": document["status"],
        "title": document["title"],
        "path": document.get("path", ""),
        "sizeInBytes": document.get("size_in_bytes", 0),
        "vectors": document.get("vectors", 0),
        "subDocuments": document.get("sub_documents"),
        "errors": document.get("errors", ""),
        "createdAt": document["created_at"],
        "updatedAt": document["updated_at"],
    }
