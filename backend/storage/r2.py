import boto3
from botocore.config import Config
from config import settings
import io
import uuid

def get_r2_client():
    if not settings.R2_ACCESS_KEY_ID:
        return None
        
    return boto3.client(
        's3',
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version='s3v4')
    )

def upload_text_to_r2(text: str, prefix: str = "chats") -> str:
    """
    Uploads a text string to R2 and returns the object key.
    """
    if not text:
        return ""
        
    client = get_r2_client()
    if not client:
        return text # Fallback to returning raw text if R2 is not configured
        
    key = f"{prefix}/{uuid.uuid4().hex}.txt"
    
    # Upload as a file-like object
    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        Body=text.encode('utf-8'),
        ContentType='text/plain'
    )
    
    return f"r2://{key}"

def get_presigned_url(r2_uri: str, expiration=3600) -> str:
    """
    Converts an r2:// key to a temporary presigned URL for frontend downloading.
    """
    if not r2_uri or not r2_uri.startswith("r2://"):
        return r2_uri # It's just raw text
        
    client = get_r2_client()
    if not client:
        return ""
        
    key = r2_uri.replace("r2://", "")
    
    try:
        response = client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.R2_BUCKET_NAME, 'Key': key},
            ExpiresIn=expiration
        )
        return response
    except Exception as e:
        print(f"Error generating presigned URL: {e}")
        return ""

def get_text_from_r2(r2_uri: str) -> str:
    """
    Directly fetches the text content of an object from R2.
    """
    if not r2_uri or not r2_uri.startswith("r2://"):
        return r2_uri
        
    client = get_r2_client()
    if not client:
        return ""
        
    key = r2_uri.replace("r2://", "")
    
    try:
        response = client.get_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
        return response['Body'].read().decode('utf-8')
    except Exception as e:
        print(f"Error reading object from R2: {e}")
        return ""
