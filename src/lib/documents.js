import { showToast } from './ui';

/**
 * Downloads a file from the server
 * @param {string} documentId - The ID of the document to download
 * @param {string} [filename] - Optional filename to use for the download
 * @returns {Promise<void>}
 */
export async function downloadDocument(documentId, filename) {
  try {
    const res = await fetch(`/api/documents?id=${documentId}`);
    
    if (!res.ok) {
      const error = await res.text().catch(() => 'Download failed');
      throw new Error(error);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || res.headers.get('X-GridFS-Filename') || 'document';
    
    // Append to body, trigger click, and clean up
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    // Clean up the object URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
  } catch (error) {
    showToast({
      type: 'error',
      message: error.message || 'Failed to download document',
    });
    throw error;
  }
}

/**
 * Previews a document in a new tab if the browser can display it
 * @param {string} documentId - The ID of the document to preview
 * @returns {Promise<void>}
 */
export async function previewDocument(documentId) {
  try {
    // First get metadata to check content type
    const meta = await getDocumentMeta(documentId);
    
    // Check if the content type is viewable in browser
    const viewableTypes = [
      'application/pdf',
      'image/', 
      'text/',
      'application/json',
    ];
    
    const canPreview = viewableTypes.some(type => meta.type?.startsWith(type));
    
    if (canPreview) {
      // Open in new tab for viewing
      window.open(`/api/documents?id=${documentId}`, '_blank');
    } else {
      // Trigger download for non-viewable types
      await downloadDocument(documentId, meta.filename);
    }
  } catch (error) {
    showToast({
      type: 'error',
      message: error.message || 'Failed to preview document',
    });
    throw error;
  }
}

/**
 * Gets document metadata using HEAD request
 * @param {string} documentId - The ID of the document
 * @returns {Promise<{
 *   size: string | null,
 *   type: string | null,
 *   filename: string | null,
 *   uploadDate: string | null
 * }>}
 */
export async function getDocumentMeta(documentId) {
  try {
    const res = await fetch(`/api/documents?id=${documentId}`, { 
      method: 'HEAD',
      credentials: 'include' // For future auth
    });
    
    if (!res.ok) {
      const error = await res.text().catch(() => 'Failed to fetch document metadata');
      throw new Error(error);
    }
    
    return {
      size: res.headers.get('Content-Length'),
      type: res.headers.get('Content-Type'),
      filename: res.headers.get('X-GridFS-Filename'),
      uploadDate: res.headers.get('X-GridFS-UploadDate')
    };
  } catch (error) {
    showToast({
      type: 'error',
      message: error.message || 'Failed to get document metadata',
    });
    throw error;
  }
}

/**
 * Deletes a document
 * @param {string} documentId - The ID of the document to delete
 * @returns {Promise<{id: string}>}
 */
export async function deleteDocument(documentId) {
  try {
    const res = await fetch(`/api/documents?id=${documentId}`, { 
      method: 'DELETE',
      credentials: 'include', // For future auth
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete document');
    }
    
    showToast({
      type: 'success',
      message: 'Document deleted successfully',
    });
    
    return data.data; // { id }
  } catch (error) {
    showToast({
      type: 'error',
      message: error.message || 'Failed to delete document',
    });
    throw error;
  }
}

/**
 * Confirms and deletes a document
 * @param {string} documentId - The ID of the document to delete
 * @param {string} [documentName] - Optional document name for confirmation message
 * @returns {Promise<boolean>} - True if deleted, false if cancelled
 */
export async function confirmAndDeleteDocument(documentId, documentName) {
  try {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${documentName ? `"${documentName}"` : 'this document'}?`
    );
    
    if (!confirmed) return false;
    
    await deleteDocument(documentId);
    showToast({
      type: 'success',
      message: 'Document deleted successfully',
    });
    return true;
  } catch (error) {
    showToast({
      type: 'error',
      message: error.message || 'Failed to delete document',
    });
    return false;
  }
}

/**
 * Updates a document's title
 * @param {string} documentId - The ID of the document to update
 * @param {string} title - New title for the document
 * @returns {Promise<{success: boolean, data: {id: string, title: string}}>}
 */
export async function updateDocumentTitle(documentId, title) {
  try {
    const response = await fetch(`/api/documents?id=${documentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update document title');
    }

    const result = await response.json();
    
    if (result.success) {
      showToast({
        type: 'success',
        message: 'Document title updated successfully',
      });
    }
    
    return result;
  } catch (error) {
    showToast({
      type: 'error',
      message: error.message || 'Failed to update document title',
    });
    throw error;
  }
}

/**
 * Updates a document's metadata (title and/or category)
 * @param {string} documentId
 * @param {{ title?: string, category?: string, folder?: string }} payload
 */
export async function updateDocumentMeta(documentId, payload) {
  try {
    const body = {};
    if (typeof payload?.title === 'string') body.title = payload.title;
    if (typeof payload?.category === 'string') body.category = payload.category;
    if (typeof payload?.folder === 'string') body.folder = payload.folder; // alias supported by API

    const response = await fetch(`/api/documents?id=${documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to update document');
    }

    showToast({ type: 'success', message: 'Document updated successfully' });
    return result;
  } catch (error) {
    showToast({ type: 'error', message: error.message || 'Failed to update document' });
    throw error;
  }
}
