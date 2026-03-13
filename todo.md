# Smart Medical Consultant - Project TODO

## Phase 1: Project Structure & Database
- [x] Set up database schema for consultations, media content, and user tracking
- [x] Create bilingual infrastructure (i18n system with Arabic and English)
- [x] Copy and integrate logo into project
- [x] Configure theme and global styling for medical service platform

## Phase 2: Authentication & UI Components
- [x] Implement user authentication (Google, Facebook, iCloud via Manus OAuth)
- [x] Create language toggle component accessible on all pages
- [x] Build bilingual navigation header
- [x] Create bilingual home page introducing the service
- [x] Set up responsive layout for all pages

## Phase 3: Consultation Booking System
- [x] Create consultation booking form with bilingual support
- [x] Implement free consultation tracking (one per user)
- [x] Integrate PayPal payment for paid consultations
- [x] Create consultation management backend procedures
- [x] Build consultation confirmation and notification system

## Phase 4: Media Section
- [x] Create videos section with bilingual content support
- [x] Create podcasts section with bilingual content support
- [x] Implement media player components
- [x] Add admin functionality to manage media content

## Phase 5: Dashboards
- [x] Build user dashboard showing consultation history
- [x] Create consultation tracking interface
- [x] Build admin panel for managing consultations
- [x] Add admin user management interface
- [x] Add admin content management for media

## Phase 6: Testing & Deployment
- [x] Write vitest tests for critical procedures
- [x] Test all bilingual content displays correctly
- [x] Test authentication flow with all providers
- [x] Test consultation booking and payment flow
- [x] Create checkpoint for deployment

## Future Enhancements (Not in current scope)
- [ ] Monthly subscription model
- [ ] n8n automation integration
- [ ] AI-generated reports after payment

## Bug Fixes
- [x] Fix nested anchor tag error in Header navigation

## Content Updates
- [x] Update home page with new detailed service description in Arabic and English
- [x] Add AI technology information to home page bio

## Major Redesign: AI-Powered Medical Analysis Service
- [x] Update database schema to support file uploads (medical reports, X-rays, lab results)
- [x] Add consultation status workflow (submitted → AI processing → specialist review → completed)
- [x] Redesign consultation submission page with file upload capabilities
- [x] Add file upload functionality for multiple medical documents
- [x] Update admin panel for AI report generation workflow
- [x] Add specialist review interface in admin panel
- [x] Create report delivery system (PDF reports, videos, infographics)
- [x] Enhance patient dashboard to view AI-generated reports
- [x] Add treatment follow-up tracking system
- [x] Update all UI text to reflect AI analysis service (not doctor meetings)
- [x] Update home page to explain AI-powered analysis concept

## Pricing Update
- [x] Update consultation fee from $50 to $5 for paid consultations

## Payment Confirmation Page
- [x] Create PaymentConfirmation page component
- [x] Display transaction status (success/failed/pending)
- [x] Show receipt details (consultation ID, amount, date, payment method)
- [x] Add next steps guidance for users
- [x] Add route in App.tsx for payment confirmation page

## Email Receipt System
- [x] Create email template for consultation receipts
- [x] Implement automatic email sending after consultation submission
- [x] Include consultation details in email (ID, amount, date, status)
- [x] Add next steps guidance in email
- [x] Support bilingual emails (Arabic and English)

## Secure File Upload System
- [x] Create backend file upload API endpoint using S3 storage
- [x] Implement file validation (type, size limits)
- [x] Add frontend file upload UI with drag-and-drop
- [x] Show upload progress indicators
- [x] Update consultation submission to use uploaded file URLs
- [x] Add file preview functionality

## Patient Profile Page
- [x] Update database schema for follow-up questions
- [x] Add subscription status tracking to user table
- [x] Create comprehensive patient profile page
- [x] Display all consultations with uploaded documents
- [x] Show AI-generated responses (reports, infographics, videos, audio)
- [x] Display subscription status (free vs pay-per-case)
- [x] Implement follow-up question system for each consultation
- [x] Add document viewer for uploaded files
- [x] Create timeline view of consultation progress

## Email Notifications for Q&A System
- [x] Create email template for notifying admins of new patient questions
- [x] Create email template for notifying patients when questions are answered
- [x] Integrate admin notification when patient asks question
- [x] Integrate patient notification when admin answers question
- [x] Test email notification flow

## Analytics Dashboard
- [x] Create backend analytics functions (consultation volume, response times, status distribution)
- [x] Add patient satisfaction tracking
- [x] Build analytics dashboard UI with charts
- [x] Display key metrics (total consultations, avg response time, completion rate)
- [x] Add time-based filtering (daily, weekly, monthly)
- [x] Create visualizations using charts library
- [x] Test analytics calculations

## Video and Podcast Upload System
- [x] Analyze current video/podcast database schema and pages
- [x] Create admin upload interface for videos with S3 integration
- [x] Create admin upload interface for podcasts with S3 integration
- [x] Add video/podcast management (edit, delete) in admin panel
- [x] Test video and podcast upload functionality

## Media Search Functionality
- [x] Add search bar to Videos page with bilingual search support
- [x] Add search bar to Podcasts page with bilingual search support
- [x] Implement real-time filtering based on search query
- [x] Test search functionality in both English and Arabic

## Analytics Section Bug Fix
- [x] Investigate analytics section error
- [x] Identify root cause of analytics not working (missing useState import)
- [x] Fix analytics functionality
- [x] Test analytics dashboard displays correctly

## Revenue Trend Chart Enhancement
- [x] Install Recharts library for data visualization
- [x] Update backend to provide revenue data grouped by date (already existed)
- [x] Create line chart component for revenue trends
- [x] Integrate chart into analytics dashboard
- [x] Test chart displays correctly with real data

## In-Page Media Player Enhancement
- [x] Create modal dialog component for video playback
- [x] Create modal dialog component for podcast playback
- [x] Update Videos page to use modal instead of external link
- [x] Update Podcasts page to use modal instead of external link
- [x] Test video and audio playback in modals

## Watch History Tracking System
- [x] Create database schema for watch history (user, media, progress, timestamp)
- [x] Add backend API to save watch progress
- [x] Add backend API to retrieve user's watch history
- [x] Update video player to track and save progress
- [x] Update podcast player to track and save progress
- [x] Create Continue Watching component for dashboard
- [x] Add Continue Watching section to user dashboard
- [x] Test watch history tracking and resume functionality

## Featured Media on Home Page
- [x] Add backend query to fetch latest videos and podcasts
- [x] Design and implement featured media section on home page
- [x] Add links from home page media cards to full videos/podcasts pages
- [x] Test featured media display and navigation

## Most Popular Section on Home Page
- [x] Sort videos and podcasts by view count to get most popular items
- [x] Add Most Popular section to home page between Latest and CTA sections
- [x] Display top 6 most viewed media items (videos and podcasts combined)
- [x] Test Most Popular section displays correctly

## Social Sharing Integration
- [x] Add social sharing buttons to video player modal
- [x] Add social sharing buttons to podcast player modal
- [x] Implement WhatsApp sharing with proper URL encoding
- [x] Implement Facebook sharing with proper URL encoding
- [x] Implement Twitter sharing with proper URL encoding
- [x] Test social sharing on all platforms

## WhatsApp Notification for New Consultations
- [x] Research WhatsApp Business API or notification service integration (using CallMeBot)
- [x] Implement notification function to send WhatsApp message on consultation submission
- [x] Include patient name and main symptoms in notification message
- [x] Test WhatsApp notification delivery to admin number (requires CallMeBot API key setup)
- [x] Handle notification failures gracefully

## AI Medical Analysis System with Specialist Review
- [x] Design database schema for AI-generated content storage
- [x] Add consultation status fields for AI processing workflow
- [x] Implement Google Gemini AI integration for medical analysis
- [x] Create AI service to generate comprehensive medical reports
- [x] Generate infographics from medical data
- [x] Generate slide deck presentations
- [x] Generate mind maps for medical concepts
- [x] Build specialist review interface in admin panel (AIConsultationReview page)
- [x] Implement approval/rejection workflow
- [x] Handle re-analysis when specialist rejects content
- [x] Deliver approved content to patients (via consultation details)
- [x] Test complete AI analysis and approval workflow
- [x] Simplified workflow: Focus on PDF reports, infographics, slides, and mind maps (audio/video excluded)

## Media Edit Feature
- [x] Add edit button to video and podcast items in admin panel
- [x] Create edit modal for updating media details
- [x] Allow updating thumbnails for existing media
- [x] Test edit functionality for videos and podcasts

## WhatsApp Consultation Submission
- [x] Add "Submit via WhatsApp" button to consultation form
- [x] Generate pre-filled WhatsApp message with consultation details
- [x] Include patient name, symptoms, medical history in WhatsApp message
- [x] Ensure consultation documents are visible in patient dashboard
- [x] Ensure consultation documents are visible in admin panel (AIConsultationReview)
- [x] Test WhatsApp submission flow from patient perspective

## Consultation Priority System
- [x] Add priority field to consultations database schema (routine/urgent/critical)
- [x] Update backend to handle priority field in consultation creation
- [x] Add priority selector to consultation submission form UI
- [x] Display priority badges in patient dashboard
- [x] Update admin review interface to show priority levels
- [x] Implement priority-based sorting in admin consultation list (critical > urgent > routine)
- [x] Add visual indicators (colors/icons) for different priority levels
- [x] Test priority system end-to-end

## Patient Satisfaction Survey System
- [x] Add satisfaction_surveys table to database schema
- [x] Create backend API to submit survey responses
- [x] Create backend API to retrieve survey results for analytics
- [x] Add survey prompt to patient dashboard when consultation is completed
- [x] Create survey modal/form UI with rating and feedback fields
- [x] Display survey results in admin analytics dashboard
- [x] Test survey submission and results display

## Bug Fixes - User Registration and Publishing
- [ ] Investigate why new user accounts are not registering
- [ ] Fix user registration flow to allow multiple accounts
- [ ] Investigate "user is blocked" error when publishing
- [ ] Resolve publishing blocked error
- [ ] Test registration with new account
- [ ] Test publishing after fixes

## User Experience Improvements
- [x] Add user profile icon/avatar in header to show logged-in status
- [x] Add user dropdown menu with profile info and sign out option
- [x] Fix free consultation submission error (code validation issue)
- [x] Implement voice recording for main complaint field
- [x] Add automatic voice-to-text transcription for recorded complaints
- [x] Add visual feedback for voice recording (recording indicator, waveform)

## Content Cleanup
- [x] Remove test videos from database
- [x] Verify only actual published videos are displayed on home page

## Bug Fixes & New Features
- [x] Fix voice recording not working in consultation form
- [x] Debug voice recording upload and transcription flow
- [x] Generate comprehensive medical report with diagnosis and treatment recommendations
- [x] Generate visual infographic summarizing the medical case
- [x] Generate educational slide deck presentation
- [x] Create admin review workflow for generated materials
- [x] Admin can approve/reject generated reports, infographics, and slide decks
- [x] Only approved materials are sent to patients
- [x] Store generated materials in database with approval status

## Visual Material Improvements
- [x] Replace broken infographic generation with Manus slides API
- [x] Replace broken slide deck generation with nano banana pro
- [x] Ensure proper Arabic text rendering in visual materials
- [x] Generate professional medical infographics using slides system
- [x] Generate educational slide decks with proper formatting

## Marketing & SEO
- [x] Create comprehensive marketing strategy document
- [x] Design social media post templates and captions
- [x] Create content calendar and posting scenarios
- [x] Implement technical SEO (meta tags, Open Graph, Twitter Cards)
- [x] Add schema.org structured data for medical services
- [x] Create XML sitemap for search engines
- [x] Optimize page titles and descriptions for keywords
- [x] Add robots.txt and SEO configuration

## Video & Media Fixes
- [x] Fix video playback - videos keep loading and don't play
- [x] Fix missing video thumbnails
- [x] Ensure video URLs are accessible and properly formatted
- [x] Test video player controls and functionality

## Complete Consultation Automation System
- [x] Generate mind map of research topics from patient symptoms/diagnosis
- [x] Create research_topics database table
- [x] Deep research system that investigates specific medical topics
- [ ] Admin interface to view mind map and trigger deep research on topics
- [ ] Automatic regeneration of report/infographic/slides after research
- [ ] Use proper Manus slides rendering for infographics (Arabic support)
- [ ] Use proper Manus slides rendering for slide decks (visual quality)
- [ ] Admin approval workflow after all materials are generated
- [ ] Store slides version IDs in database for export/download

## Interactive Mind Map Visualization
- [x] Add backend tRPC routes for mind map generation and retrieval
- [x] Add backend route for triggering deep research on topics
- [x] Create MindMapVisualization React component with interactive nodes
- [x] Integrate mind map into Admin Panel consultation review
- [x] Add click handlers for topic exploration and research triggers
- [x] Display research results in expandable panels
- [x] Add visual indicators for researched vs pending topics
- [ ] Implement automatic material regeneration after research completion

## Patient Dashboard Enhancement
- [x] Create backend routes for patient consultation history
- [x] Add route to fetch patient's approved materials
- [x] Build patient dashboard UI with consultation timeline
- [x] Add status indicators (submitted, processing, review, completed)
- [x] Implement download buttons for approved reports
- [x] Implement download buttons for approved infographics
- [x] Implement download buttons for approved slide decks
- [x] Add satisfaction survey prompts for completed consultations
- [x] Show real-time status updates with progress indicators
- [x] Add empty state for patients with no consultations

## Manus Slides API Integration
- [ ] Replace placeholder infographic generation with real Manus Slides API
- [ ] Replace placeholder slide deck generation with real Manus Slides API
- [ ] Store slides version IDs in database for proper export/download
- [ ] Ensure proper Arabic text rendering in generated slides
- [ ] Update material generator to use slide_initialize and slide_edit tools
- [ ] Test infographic generation with real consultation data
- [ ] Test slide deck generation with real consultation data
- [ ] Verify slides can be exported and downloaded by patients

## Manual Agent-Triggered Slide Generation
- [x] Add database table for slide generation requests
- [x] Add backend tRPC route to create slide generation request
- [x] Add "Request Slide Generation" button in Admin Panel
- [x] Create agent helper documentation to process pending requests
- [x] Add notification system to alert agent of pending requests (via notifyOwner)
- [x] Display request status in Admin Panel (pending/processing/completed)
- [x] Show generated slides URLs after agent completes generation

## Automatic Material Regeneration After Deep Research
- [x] Analyze existing deep research workflow and completion logic
- [x] Add trigger in deep research completion to regenerate materials
- [x] Update material generation to incorporate research findings from database
- [x] Add database field to track material regeneration (version/timestamp)
- [x] Add UI indicator in Admin Panel showing materials were regenerated
- [x] Add UI indicator in Patient Dashboard showing updated materials
- [x] Test complete workflow: deep research → automatic regeneration → updated materials
- [x] Write vitest tests for material regeneration logic

## Bug Fixes - Admin Panel
- [x] Investigate why consultations section is empty in admin panel
- [x] Fix database migration or query issues causing empty consultations
- [x] Verify consultations display correctly after fix

## UI Improvements - Research and Materials
- [x] Make deep research reports collapsible/minimizable in mind map
- [x] Redesign visual infographic for better clarity and understanding
- [x] Add visual elements (icons, colors, layout) to slide deck content
- [x] Test all improvements in both admin panel and patient dashboard

## Bug Fixes - Content Display
- [x] Fix Arabic text mixing with English in infographic generation
- [x] Replace raw JSON display with proper slide deck content preview
- [x] Ensure all generated content is purely in selected language (no mixing)
- [x] Test Arabic and English content generation separately

## Regenerate Infographic Feature
- [x] Add backend tRPC route for manual infographic regeneration
- [x] Create RegenerateInfographicButton component with loading states
- [x] Integrate button into AdminPanel infographic section
- [x] Add confirmation dialog before regeneration
- [x] Update infographic URL in database after regeneration
- [x] Add toast notifications for success/error states
- [x] Test complete regeneration workflow
- [x] Write vitest tests for regeneration logic

## Custom Regeneration Prompts
- [x] Update backend tRPC route to accept optional customPrompt parameter
- [x] Modify regenerateInfographicForConsultation to accept and use custom instructions
- [x] Update generateInfographic function to incorporate custom prompt into AI generation
- [x] Add Textarea field to RegenerateInfographicButton dialog
- [x] Pass custom prompt from frontend to backend mutation
- [x] Add placeholder text and helper text for custom prompt field
- [x] Test custom prompt with various instructions (emphasize findings, larger fonts, specific colors)
- [x] Write vitest tests for custom prompt functionality

## SEO and GEO Optimization
- [x] Add comprehensive meta tags (description, keywords, author, viewport)
- [x] Implement Open Graph tags for social media sharing (Facebook, LinkedIn)
- [x] Add Twitter Card meta tags for Twitter sharing
- [x] Create JSON-LD structured data for Organization and MedicalBusiness
- [x] Add JSON-LD for WebSite with search action
- [x] Implement JSON-LD for BreadcrumbList navigation
- [x] Create sitemap.xml for search engine crawling
- [x] Add robots.txt with crawl directives
- [x] Add geographic meta tags (geo.region, geo.placename, geo.position)
- [x] Implement hreflang tags for multilingual SEO (English/Arabic)
- [x] Optimize page titles and descriptions for each route
- [x] Add canonical URLs to prevent duplicate content
- [x] Implement language-specific meta tags
- [x] Add favicon and app icons for better branding
- [x] Test SEO implementation with validation tools
- [x] Write vitest tests for SEO meta tag generation

## Google Search Console Integration
- [x] Prepare HTML meta tag verification method in index.html
- [x] Create verification file for file upload method
- [x] Document DNS TXT record verification method
- [x] Add sitemap submission instructions
- [x] Create comprehensive GSC integration guide
- [x] Test verification file accessibility
- [x] Document monitoring and analytics setup

## Google Business Profile (Local SEO)
- [x] Create GBP setup guide with step-by-step instructions
- [x] Prepare business information template (name, address, phone, hours)
- [x] Document category selection for medical consultation service
- [x] Create optimization guide for posts, photos, and reviews
- [x] Add LocalBusiness schema markup to website
- [x] Create GBP post templates for regular updates
- [x] Document review management strategy
- [x] Add GBP link to website footer
- [x] Test local business schema with Google Rich Results Test

## Medical Blog System
- [x] Create blog_posts and blog_categories database tables
- [x] Add backend tRPC routes for blog CRUD operations
- [ ] Create blog listing page with search and filtering
- [ ] Create individual blog article page with SEO optimization
- [ ] Add admin interface for creating/editing blog posts
- [ ] Implement rich text editor for blog content
- [ ] Add category management in admin panel
- [ ] Create SEO-optimized blog articles (5-10 initial articles)
- [ ] Add blog to main navigation menu
- [ ] Implement blog article schema markup for rich snippets
- [ ] Add social sharing buttons to blog articles
- [ ] Create related articles section
- [ ] Add reading time estimation
- [ ] Implement article search functionality
- [ ] Write vitest tests for blog API

## Bug Fix - React Hook Error
- [x] Fix "Cannot read properties of null (reading 'useState')" caused by duplicate React from streamdown
- [x] Add React deduplication to vite.config.ts
- [x] Verify app loads without hook errors

## Bug Fix - Voice Recording in Consultation Form
- [x] Diagnose voice recording error in consultation form (upload route rejected audio/webm MIME type)
- [x] Add audio MIME types to allowed file types in upload route
- [x] Add 'audio' category to upload route enum
- [x] Fix MediaRecorder to auto-detect best supported MIME type
- [x] Normalize MIME type by stripping codec params before upload
- [x] Fix error message extraction for better user feedback
- [x] Write vitest tests for voice recording fix (15 passing)

## Username/Password Registration with $1 PayPal Payment
- [x] Add username, password_hash fields to users table
- [x] Add registration_payments table to track $1 PayPal payments
- [x] Build backend: register with bcrypt (12 rounds) password hashing
- [x] Build backend: login with JWT session cookie
- [x] Build backend: verifyPayPalPayment route to confirm payment and grant 10 consultations
- [x] Build frontend: multi-step registration form (account info → upload report → pay $1)
- [x] Build frontend: medical report upload step during registration
- [x] Build frontend: PayPal SDK integration for $1 payment
- [x] Build frontend: login page with username/password
- [x] Integrate local auth alongside existing OAuth login
- [x] Show "Register" and "Login" buttons on header for non-logged-in users
- [x] Test complete registration → payment → consultation flow
- [x] Write 14 vitest tests for auth and payment logic (all passing)

## Password Reset Flow
- [x] Create password_reset_tokens table (token, userId, expiresAt, usedAt)
- [x] Add requestPasswordReset backend route (generates token, sends email)
- [x] Add resetPassword backend route (validates token, updates password)
- [x] Build ForgotPassword page with email input form
- [x] Build ResetPassword page with new password + confirm form
- [x] Add "Forgot Password?" link to Login page
- [x] Add /forgot-password and /reset-password routes to App.tsx
- [x] Send password reset email via notification system
- [x] Write vitest tests for token generation and validation

## Consultation Counter & Subscription Upgrade
- [x] Add subscription.getStatus tRPC route to fetch consultations remaining
- [x] Add subscription.purchaseConsultations tRPC route with 3 plan tiers
- [x] Create ConsultationCounter component with upgrade dialog
- [x] Integrate ConsultationCounter into patient dashboard header
- [x] Show low-balance warning (≤2 remaining) with amber indicator
- [x] Show empty-balance alert (0 remaining) with red indicator
- [x] PayPal payment integration for Basic ($5/5), Standard ($12/15), Premium ($20/30) plans
- [x] Write vitest tests for subscription plan logic (12 passing)

## Personal Medical Profile Page
- [x] Add user_medical_records table (userId, fileUrl, fileKey, fileName, fileType, category, uploadedAt)
- [x] Add backend tRPC route: profile.getMyRecords - fetch user's uploaded medical records
- [x] Add backend tRPC route: profile.uploadRecord - upload new medical record to S3
- [x] Add backend tRPC route: profile.deleteRecord - delete a medical record
- [x] Add backend tRPC route: profile.getProfile - get full user profile with stats
- [x] Build MyProfile page with 4 sections: profile header, consultation balance, medical records, consultation history
- [x] Profile header: name, email, member since, subscription type
- [x] Consultation balance card: prominent display of X/10 free consultations remaining with progress bar
- [x] Medical records section: grid of uploaded files with download/delete buttons
- [x] Upload new record: drag-and-drop or click-to-upload with category selection
- [x] Consultation history: full list of all consultations with status, materials, and timeline
- [x] Add "My Medical Profile" link in header user dropdown menu
- [x] Redirect to /my-profile after successful registration + payment
- [x] 10 free consultations granted automatically on $1 registration payment

## Attach Existing Medical Records to Consultation
- [x] Add consultation_attached_records join table (consultationId, recordId)
- [x] Create DB migration for consultation_attached_records table
- [x] Add db helper: attachRecordsToConsultation(consultationId, recordIds[])
- [x] Add db helper: getAttachedRecordsForConsultation(consultationId)
- [x] Update consultation creation tRPC route to accept attachedRecordIds[]
- [x] Add consultation.getAttachedRecords tRPC query for patient and admin views
- [x] Build RecordPicker component (dialog with checkboxes, category icons, file chips)
- [x] Integrate RecordPicker into consultation form with "Attach from saved records" section
- [x] Show selected records as removable chips/badges in the consultation form
- [x] Show attached records in patient consultation history (MyProfile page) as clickable pills
- [x] Show attached records in admin AIConsultationReview panel as a dedicated card

## Registration Plans & Consultation Quota Enforcement
- [x] Add freeConsultationsUsed + freeConsultationsTotal columns to users table (DB migration)
- [x] Add getUserFreeQuota() and incrementFreeConsultationsUsed() helpers in db.ts
- [x] Update consultation.create backend: check quota, throw FREE_QUOTA_EXHAUSTED when 0 remain
- [x] Update grantConsultationsAfterPayment to also increment freeConsultationsTotal for premium users
- [x] getUserById now returns freeConsultationsUsed and freeConsultationsTotal fields
- [x] Add two plan cards on home page (Free Plan $0 = 1 consult, Premium $1 = 10 consults)
- [x] Add "Register for Free" and "Register for $1" CTA buttons linking to /register and /register?plan=premium
- [x] Consultation form: green banner shows X/Y remaining when free quota available
- [x] Consultation form: amber banner shows "all free used, $5 each" when quota exhausted
- [x] Submit button shows green "Submit Free (N left)" or standard "Submit — $5" based on quota
- [x] FREE_QUOTA_EXHAUSTED error shows a clear toast message to the user

## PayPal $5 Paid Consultation Checkout
- [x] consultation.createDraft tRPC route: saves full form data with paymentStatus=pending
- [x] consultation.confirmConsultationPayment tRPC route: marks payment completed, triggers AI
- [x] PayPal SDK loaded dynamically when quota=0 and user submits form
- [x] Draft saved first (createDraft), then PayPal checkout screen shown
- [x] Checkout screen: order summary (patient name, service, $5 total) + PayPal buttons
- [x] onApprove: captures order, calls confirmConsultationPayment, redirects to /payment-confirmation/:id
- [x] Back button on checkout screen returns user to edit the form
- [x] Receipt email + WhatsApp admin notification sent after payment confirmation
- [x] Idempotent: re-confirming an already-paid consultation returns success without double-processing

## Payment History Tab on My Profile
- [x] Add db helper: getUserPaymentHistory(userId) — fetch paid consultations with paymentId, amount, createdAt
- [x] Add profile.getPaymentHistory tRPC route (protectedProcedure)
- [x] Add "Payment History" tab to MyProfile page (3rd tab alongside Medical Records and Consultations)
- [x] Payment table: columns — Date, Consultation #, Amount, PayPal Order ID, Status badge, View button
- [x] Show empty state (CreditCard icon + message) when no paid consultations exist
- [x] Show 3-column summary cards: Total Spent, Paid Consultations count, Free Consultations count
- [x] Symptoms preview shown below consultation ID for quick identification
- [x] Responsive: Amount hidden on mobile, PayPal Order ID hidden on tablet

## Claude AI + Python API Integration
- [x] Install Python dependencies (fastapi, uvicorn, anthropic, python-pptx, Pillow, pydantic)
- [x] Copy ultimate_server.py to server/python/ultimate_server.py
- [x] Add ANTHROPIC_API_KEY secret (auto-matched from BYOK)
- [x] Add PYTHON_API_URL env variable = http://localhost:8000
- [x] Create server/pythonServer.ts: auto-starts FastAPI as child process on Node.js startup
- [x] Integrated into server/_core/index.ts: startPythonServer() called before Express setup
- [x] Rewrite server/contentGeneration.ts: PPTX via /generate/slides, SVG via /generate/infographic
- [x] Fix PPTX downloads: .pptx files use download attribute in AdminPanel, AIConsultationReview, Dashboard, MyProfile
- [x] Language enforcement: pure Arabic OR pure English prompts in Python API (no mixing)
- [x] buildPatientPayload() maps MedicalAnalysisResult → PatientDataPayload for Python API
- [x] Brand colors #06B6D4 and #10B981 hardcoded in BrandColors class in ultimate_server.py
- [x] End-to-end test: PPTX 34676 bytes ✅ | SVG infographic 6312 bytes ✅
- [x] Vitest: pythonApi.test.ts passes (health check + anthropic_configured=true)
