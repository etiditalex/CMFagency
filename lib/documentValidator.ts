/**
 * Document Validation Utility
 * Validates uploaded files to ensure they are actual ID cards, passports, or certificates
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Validates if an uploaded file is a valid document (ID, Passport, Certificate)
 */
export async function validateDocument(
  file: File,
  documentType: 'id' | 'passport' | 'certificate'
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Basic file validation
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // 2. File size validation (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    errors.push('File size exceeds 5MB limit');
  }

  // 3. File type validation
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const validPdfType = 'application/pdf';
  const fileType = file.type.toLowerCase();

  if (documentType === 'certificate') {
    // Certificate can be PDF or image
    if (!validImageTypes.includes(fileType) && fileType !== validPdfType) {
      errors.push('Certificate must be a PDF, JPG, or PNG file');
    }
  } else {
    // ID and Passport must be images
    if (!validImageTypes.includes(fileType)) {
      errors.push(`${documentType === 'id' ? 'ID' : 'Passport'} must be a JPG or PNG image`);
    }
  }

  // 4. Image dimension validation (for images only)
  if (validImageTypes.includes(fileType)) {
    try {
      const imageValidation = await validateImageDimensions(file, documentType);
      if (!imageValidation.isValid) {
        errors.push(imageValidation.error || 'Invalid image dimensions');
      }
      if (imageValidation.warnings) {
        warnings.push(...imageValidation.warnings);
      }
    } catch (error) {
      warnings.push('Could not validate image dimensions. Please ensure the image is clear and readable.');
    }
  }

  // 5. File name validation (check for suspicious patterns)
  const fileName = file.name.toLowerCase();
  const suspiciousPatterns = ['screenshot', 'photo', 'image', 'picture', 'img_', 'dsc'];
  const isSuspicious = suspiciousPatterns.some(pattern => fileName.includes(pattern));
  
  if (isSuspicious && documentType !== 'passport') {
    warnings.push('File name suggests this might not be a document. Please upload the actual document.');
  }

  if (errors.length > 0) {
    return { isValid: false, error: errors.join('. ') };
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validates image dimensions to ensure it's document-like
 */
async function validateImageDimensions(
  file: File,
  documentType: 'id' | 'passport' | 'certificate'
): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = img.width;
      const height = img.height;
      const aspectRatio = width / height;
      const warnings: string[] = [];

      // Document aspect ratios:
      // ID cards: typically 1.5:1 to 1.7:1 (portrait or landscape)
      // Passports: typically 1.4:1 (portrait)
      // Certificates: typically 1.3:1 to 1.5:1 (portrait) or 1.7:1 (landscape)

      let isValidAspectRatio = false;

      if (documentType === 'id') {
        // ID can be portrait (0.6-0.7) or landscape (1.5-1.7)
        isValidAspectRatio = 
          (aspectRatio >= 0.6 && aspectRatio <= 0.7) || // Portrait ID
          (aspectRatio >= 1.5 && aspectRatio <= 1.7); // Landscape ID
      } else if (documentType === 'passport') {
        // Passport is typically portrait (0.7-0.75)
        isValidAspectRatio = aspectRatio >= 0.7 && aspectRatio <= 0.75;
      } else {
        // Certificate can vary more
        isValidAspectRatio = 
          (aspectRatio >= 0.65 && aspectRatio <= 0.8) || // Portrait
          (aspectRatio >= 1.3 && aspectRatio <= 1.7); // Landscape
      }

      // Minimum resolution check (documents should be readable)
      const minResolution = 300; // Minimum width or height
      const isHighRes = width >= minResolution || height >= minResolution;

      if (!isValidAspectRatio) {
        resolve({
          isValid: false,
          error: `Image dimensions don't match typical ${documentType} proportions. Please ensure you're uploading the actual document.`,
        });
        return;
      }

      if (!isHighRes) {
        warnings.push('Image resolution is low. Please ensure the document is clear and readable.');
      }

      // Check if image is too small (likely not a real document)
      if (width < 200 || height < 200) {
        resolve({
          isValid: false,
          error: 'Image is too small. Please upload a clear, high-quality image of the document.',
        });
        return;
      }

      resolve({
        isValid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        isValid: false,
        error: 'Invalid image file. Please upload a valid image.',
      });
    };

    img.src = url;
  });
}

/**
 * Validates if image contains text-like patterns (basic heuristic)
 * This is a simple check - for production, use a proper OCR service
 */
export async function hasTextContent(file: File): Promise<boolean> {
  // This is a placeholder - in production, you'd use:
  // - Tesseract.js for client-side OCR
  // - Google Cloud Vision API
  // - AWS Rekognition
  // - Azure Computer Vision
  
  // For now, we'll do basic validation
  // Real text detection would require OCR
  return true; // Assume valid for now
}

/**
 * Gets human-readable document type name
 */
export function getDocumentTypeName(type: 'id' | 'passport' | 'certificate'): string {
  switch (type) {
    case 'id':
      return 'ID Card';
    case 'passport':
      return 'Passport';
    case 'certificate':
      return 'Certificate of Good Conduct';
    default:
      return 'Document';
  }
}


