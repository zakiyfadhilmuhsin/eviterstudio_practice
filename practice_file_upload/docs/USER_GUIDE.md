# User Guide

A comprehensive guide for using the EviterStudio File Upload web interface.

## 🎯 Getting Started

The EviterStudio File Upload application provides an intuitive web interface for uploading and managing files. Access the application by navigating to `http://localhost:3018` in your web browser.

## 🖥️ Interface Overview

### Header Section

- **Logo & Title**: EviterStudio File Upload branding
- **Connection Status**: Real-time server connection indicator
  - 🟢 Green: Connected and operational
  - 🔴 Red: Connection issues or server offline
  - 🟡 Yellow: Checking connection

### Main Navigation Tabs

The interface features two main upload modes:

1. **Single Upload**: Upload one file at a time
2. **Multiple Upload**: Upload up to 10 files simultaneously

## 📤 Uploading Files

### Single File Upload

1. **Select Upload Tab**
   - Click the "Single Upload" tab (default selection)

2. **Choose File**
   - **Method 1 - Drag & Drop**:
     - Drag a file from your computer onto the upload area
     - The area will highlight when a file is dragged over it
   - **Method 2 - Browse**:
     - Click the "Browse Files" button
     - Select a file from the file dialog

3. **File Preview**
   - Once selected, you'll see:
     - File icon (based on file type)
     - Original filename
     - File size in human-readable format
     - File type indicator

4. **Upload Process**
   - Click the "Upload File" button
   - Progress indicator will show upload status
   - Success notification will appear upon completion
   - File will automatically appear in the file manager

### Multiple Files Upload

1. **Select Upload Tab**
   - Click the "Multiple Upload" tab

2. **Choose Files**
   - **Method 1 - Drag & Drop**:
     - Drag multiple files onto the upload area
     - All files will be processed at once
   - **Method 2 - Browse**:
     - Click the "Browse Files" button
     - Select multiple files (Ctrl+click or Shift+click)

3. **Review Selected Files**
   - Selected files appear in a list below the upload area
   - Each file shows:
     - Filename and size
     - File type icon
     - Remove button (×) to exclude files
   - Maximum 10 files per upload session

4. **Upload Process**
   - Click the "Upload Files" button
   - Batch upload progress will be displayed
   - Success notification shows total files uploaded
   - All files will appear in the file manager

### Supported File Types

✅ **Images**: JPG, PNG, GIF, WebP, SVG
✅ **Documents**: PDF, DOC, DOCX, TXT
✅ **Archives**: ZIP, RAR (if configured)

### File Limitations

- **Maximum file size**: 10MB per file
- **Maximum files per batch**: 10 files
- **Total batch size**: 100MB maximum

## 📂 File Management

### File Manager Interface

The file manager displays all uploaded files in a grid layout with comprehensive controls.

### Search and Filtering

1. **Search Box**
   - Located in the top-right of the file manager
   - Search by filename (partial matching supported)
   - Real-time search as you type

2. **Sort Options**
   - **Newest First**: Most recently uploaded files first
   - **Oldest First**: Oldest uploads first
   - **Largest First**: Sort by file size (descending)
   - **Smallest First**: Sort by file size (ascending)
   - **Name A-Z**: Alphabetical by filename
   - **Name Z-A**: Reverse alphabetical

3. **Type Filter**
   - **All Types**: Show all files
   - **Images**: Show only image files
   - **PDF**: Show only PDF documents
   - **Text**: Show only text files
   - **Documents**: Show only document files

4. **Pagination**
   - **10 per page**: Default view
   - **25 per page**: Medium density
   - **50 per page**: High density

### File Actions

Each file in the grid displays:

1. **File Information**
   - Thumbnail or type icon
   - Filename
   - File size
   - Upload date and time
   - File type indicator

2. **Action Buttons**
   - **View**: Open file details modal
   - **Download**: Download the original file
   - **Delete**: Remove file (with confirmation)

### File Details Modal

Clicking "View" opens a detailed modal showing:

- **File Metadata**
  - Original filename
  - File type and MIME type
  - File size (bytes and human-readable)
  - Upload timestamp
  - Storage location (URL)

- **Actions**
  - **Download**: Direct download link
  - **Copy URL**: Copy public URL to clipboard
  - **Delete**: Delete with confirmation

## 📊 Analytics Dashboard

### Real-time Statistics

The analytics section provides live statistics:

1. **Total Files**
   - Count of all uploaded files
   - Updates in real-time

2. **Upload Sessions**
   - Number of completed upload sessions
   - Tracks both single and multiple uploads

3. **Total Storage Used**
   - Cumulative size of all files
   - Displayed in MB/GB format

4. **Last Upload**
   - Timestamp of most recent upload
   - Shows "Never" if no uploads yet

### Auto-refresh

- Analytics update automatically every 30 seconds
- Manual refresh available via "Refresh" button
- Real-time updates on new uploads

## 🔄 Real-time Features

### Live Updates

- **File List**: Automatically refreshes after uploads
- **Analytics**: Updates every 30 seconds
- **Status Indicators**: Real-time connection monitoring
- **Progress Bars**: Live upload progress tracking

### Notifications

The application provides toast notifications for:

- ✅ **Success**: Upload completion, file deletion
- ⚠️ **Warnings**: File size limits, unsupported formats
- ❌ **Errors**: Upload failures, network issues
- ℹ️ **Info**: General information and tips

## 🎨 Interface Features

### Modern Design

- **Glassmorphism**: Translucent panels with blur effects
- **Responsive Layout**: Adapts to different screen sizes
- **Dark/Light Theme**: Automatic theme adaptation
- **Smooth Animations**: Fluid transitions and interactions

### Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Compatible**: ARIA labels and descriptions
- **High Contrast**: Clear visual hierarchy
- **Focus Indicators**: Visible focus states

### Mobile Responsiveness

- **Touch-Friendly**: Large touch targets
- **Responsive Grid**: Adapts to mobile screens
- **Mobile Upload**: Supports mobile file selection
- **Swipe Gestures**: Touch-based interactions

## 🛠️ Troubleshooting

### Common Issues

1. **Connection Problems**
   - Check if server is running on port 3018
   - Verify network connectivity
   - Look for red status indicator in header

2. **Upload Failures**
   - Check file size (max 10MB)
   - Verify file type is supported
   - Ensure stable internet connection
   - Try refreshing the page

3. **Files Not Appearing**
   - Wait for automatic refresh (30 seconds)
   - Click the manual "Refresh" button
   - Check if upload actually completed

4. **Slow Performance**
   - Large files take longer to upload
   - Multiple simultaneous uploads may slow down
   - Check your internet connection speed

### Error Messages

- **"No file provided"**: Select a file before uploading
- **"File too large"**: Reduce file size below 10MB
- **"Unsupported file type"**: Use supported formats only
- **"Upload failed"**: Check connection and try again
- **"Server unavailable"**: Contact system administrator

### Browser Compatibility

✅ **Fully Supported**:
- Chrome 90+
- Firefox 85+
- Safari 14+
- Edge 90+

⚠️ **Limited Support**:
- Internet Explorer (not recommended)
- Older mobile browsers

## 💡 Tips and Best Practices

### Optimal Usage

1. **File Organization**
   - Use descriptive filenames
   - Keep files under 10MB for best performance
   - Group related files in multiple upload sessions

2. **Upload Strategy**
   - Use single upload for large files
   - Use multiple upload for related documents
   - Monitor upload progress before navigating away

3. **File Management**
   - Regularly review and delete unnecessary files
   - Use search and filters to find files quickly
   - Download important files as backup

### Performance Tips

1. **Network Optimization**
   - Use stable internet connection for large uploads
   - Avoid uploading during peak network hours
   - Consider compressing large files before upload

2. **Browser Optimization**
   - Keep browser updated
   - Clear cache if experiencing issues
   - Disable unnecessary browser extensions

## 🔐 Security and Privacy

### File Security

- Files are stored securely in DigitalOcean Spaces
- Each file gets a unique identifier and URL
- Access is controlled through the application

### Privacy Considerations

- Uploaded files are accessible via public URLs
- Consider data sensitivity before uploading
- Delete files when no longer needed

### Best Practices

- Don't upload sensitive personal information
- Use appropriate file permissions
- Regularly audit and clean up old files

## 📞 Support

### Getting Help

1. **Documentation**: Review this guide and the [README](../README.md)
2. **API Reference**: Check the [API documentation](API.md)
3. **Issues**: Report bugs or request features via the repository
4. **Logs**: Check browser console for technical details

### Reporting Issues

When reporting problems, include:

- Browser type and version
- File types and sizes attempted
- Error messages received
- Steps to reproduce the issue
- Console logs (if applicable)

### Feature Requests

The application is actively developed. Feature requests are welcome for:

- Additional file type support
- Enhanced file management features
- Integration capabilities
- Performance improvements