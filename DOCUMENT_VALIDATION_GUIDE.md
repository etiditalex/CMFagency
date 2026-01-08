# Document Validation System

## Overview

The application now includes security checks to verify that uploaded files are actual ID cards, passports, or certificates of good conduct, not just any random photos.

## What Gets Validated

### 1. ID Cards (Front & Back)
- ✅ File type: JPG, PNG only
- ✅ File size: Maximum 5MB
- ✅ Image dimensions: Must match ID card proportions (portrait or landscape)
- ✅ Resolution: Minimum 200x200 pixels
- ✅ File name: Warns if filename suggests it's not a document

### 2. Passport Photos
- ✅ File type: JPG, PNG only
- ✅ File size: Maximum 5MB
- ✅ Image dimensions: Must match passport proportions (typically portrait)
- ✅ Resolution: Minimum 200x200 pixels
- ✅ File name: Warns if filename suggests it's not a document

### 3. Certificate of Good Conduct
- ✅ File type: PDF, JPG, or PNG
- ✅ File size: Maximum 5MB
- ✅ Image dimensions: Must match certificate proportions (if image)
- ✅ Resolution: Minimum 200x200 pixels (if image)

## Validation Features

### Real-time Validation
- Files are validated immediately upon upload
- Visual feedback shows validation status
- Invalid files are automatically rejected

### Validation Checks

1. **File Type Validation**
   - Ensures only valid file formats are accepted
   - ID/Passport: Images only (JPG, PNG)
   - Certificate: PDF or images

2. **File Size Validation**
   - Maximum 5MB per file
   - Prevents oversized uploads

3. **Image Dimension Validation**
   - Checks aspect ratio matches document type
   - ID cards: 1.5:1 to 1.7:1 (landscape) or 0.6:0.7 (portrait)
   - Passports: 0.7:0.75 (portrait)
   - Certificates: 0.65:0.8 (portrait) or 1.3:1.7 (landscape)

4. **Resolution Validation**
   - Minimum 200x200 pixels
   - Warns if resolution is too low

5. **File Name Analysis**
   - Warns if filename suggests it's not a document
   - Checks for patterns like "screenshot", "photo", "image"

## User Experience

### Validation States

1. **Validating** (Blue)
   - Shows spinner while validating
   - "Validating document..." message

2. **Valid** (Green)
   - Shows checkmark icon
   - File name displayed
   - File is accepted

3. **Invalid** (Red)
   - Shows error icon
   - Error message displayed
   - File is rejected and input cleared

4. **Warnings** (Yellow)
   - Shows warning icon
   - Warning messages displayed
   - File is still accepted but user is warned

## Error Messages

### Common Errors:
- "File size exceeds 5MB limit"
- "ID must be a JPG or PNG image"
- "Image dimensions don't match typical ID proportions"
- "Image is too small. Please upload a clear, high-quality image"
- "Invalid image file. Please upload a valid image"

### Common Warnings:
- "File name suggests this might not be a document"
- "Image resolution is low. Please ensure the document is clear"

## Technical Implementation

### Files Created:
- `lib/documentValidator.ts` - Validation utility functions

### Files Modified:
- `app/application/page.tsx` - Added validation to file upload handlers

### Validation Flow:
1. User selects file
2. File is validated using `validateDocument()`
3. Validation result is stored in state
4. UI updates to show validation status
5. File is only accepted if validation passes

## Future Enhancements

For production, consider adding:

1. **OCR Text Detection**
   - Use Tesseract.js for client-side OCR
   - Verify document contains text
   - Extract and validate ID numbers

2. **Server-side Validation**
   - API route for additional validation
   - Use services like:
     - Google Cloud Vision API
     - AWS Rekognition
     - Azure Computer Vision

3. **Advanced Document Detection**
   - Detect document borders
   - Verify document structure
   - Check for security features (watermarks, holograms)

4. **Image Quality Checks**
   - Blur detection
   - Brightness/contrast validation
   - Orientation correction

## Testing

To test the validation:

1. Try uploading a regular photo → Should be rejected
2. Try uploading a screenshot → Should show warning
3. Try uploading a properly cropped ID → Should be accepted
4. Try uploading a file that's too large → Should be rejected
5. Try uploading wrong file type → Should be rejected

## Notes

- Validation happens client-side for immediate feedback
- Files are validated before being stored
- Invalid files are automatically cleared from the input
- CV uploads are not validated (only ID, Passport, Certificate)

