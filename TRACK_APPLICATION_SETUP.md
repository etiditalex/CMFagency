# Track Application Portal Setup Guide

## Overview
The Track Application portal allows users to track their application status using:
- National ID Number
- Phone Number
- CMF Agency ID

## Database Setup

### 1. Create Applications Table in Supabase

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Open the SQL file: `database/applications_table.sql`
4. Copy and paste the entire SQL script into the SQL Editor
5. Click **Run** to execute the script

The SQL script will:
- Create the `applications` table with all necessary fields
- Create indexes for faster queries
- Set up automatic `updated_at` timestamp trigger
- Enable Row Level Security (RLS)
- Create the optional `users` table for linking applications to user accounts

## Features

### Application Submission
- When users submit applications, they are automatically saved to the database
- Each application gets a unique CMF Agency ID (format: CMF-XXXXXX)
- Tracking identifiers (National ID, Phone, CMF Agency ID) are stored

### Application Tracking
- Users can track applications using any of the three methods
- Status can be: pending, accepted, rejected, under review
- Application details are displayed including status, type, and submission date

## API Endpoints

### POST /api/submit-application
Saves application data to the database.

**Request Body:**
```json
{
  "userId": "optional-user-id",
  "firstName": "John",
  "secondName": "Doe",
  "email": "john@example.com",
  "phone": "+254700000000",
  "idNumber": "12345678",
  "applicationType": "job",
  "jobPosition": "Marketing Manager",
  ...
}
```

**Response:**
```json
{
  "success": true,
  "applicationId": "uuid",
  "cmfAgencyId": "CMF-123456",
  "message": "Application submitted successfully"
}
```

### POST /api/track-application
Retrieves application status.

**Request Body:**
```json
{
  "method": "nationalId" | "phoneNumber" | "cmfAgencyId",
  "value": "12345678"
}
```

**Response:**
```json
{
  "success": true,
  "application": {
    "id": "uuid",
    "cmfAgencyId": "CMF-123456",
    "applicationType": "job",
    "status": "pending",
    "name": "John Doe",
    "submittedAt": "2024-01-01T00:00:00Z",
    "notes": null
  }
}
```

## Usage

1. Users submit applications through `/application` page
2. Application is saved to database with CMF Agency ID
3. Users can track their application at `/track-application`
4. Admin can update application status in Supabase dashboard

## Updating Application Status

To update an application status in Supabase:

1. Go to Supabase Dashboard → Table Editor → applications
2. Find the application by CMF Agency ID, National ID, or Phone
3. Update the `status` field to: "pending", "accepted", "rejected", or "under review"
4. Optionally add notes in the `notes` field

## Notes

- The CMF Agency ID is automatically generated for each application
- Applications are linked to user accounts if user is logged in
- All tracking methods work independently
- The system supports multiple applications per user (shows most recent)
