# MedTrack Flutter Implementation

This directory contains the Flutter frontend implementation for the MedTrack medical reports management system.

## Features Implemented

### 1. Home Page with Category Buttons
- **Recent Reports Section**: Displays the 5 most recent medical reports in a horizontal scrollable list
- **Category Buttons**: Two large, visually appealing buttons for:
  - Lab Reports (Blue with science icon)
  - Image Reports (Purple with image icon)

### 2. Expandable Category Selection
- Click on either category button to see all available categories
- Each category can be expanded to show subcategories
- "View All" button to see all tests in a category (without subcategory filter)
- Tap on any subcategory to view the detailed table

### 3. Excel-Like Table View
- **Rows**: Each row represents a test parameter
  - Parameter name
  - Unit of measurement
  - Reference range
- **Columns**: Each column represents a date
  - Horizontally scrollable to view all dates
  - Dates are sorted chronologically
- **Cells**: Show the test value and status (NORMAL/HIGH/LOW)
  - Color-coded based on status:
    - Green: NORMAL
    - Red: HIGH
    - Orange: LOW
- **Summary Row**: Last row shows summary statistics for each date
  - Normal count
  - Abnormal count
  - Total tests

### 4. Comparison Feature
- **Comparison Button**: In the app bar of the table view
- Click to enter comparison mode
- **Checkbox Selection**: Click on date column headers to select dates
  - Maximum 2 dates can be selected
  - Selected columns are highlighted
- **Compare Button**: Appears when 2 dates are selected
- **Comparison Report**: Shows in a dialog with:
  - Side-by-side comparison of old vs new values
  - Change amount and percentage
  - Trend indicators (increased/decreased/stable)
  - Interpretation of the change
  - Color-coded status indicators
  - Comparison is always done with the older date as baseline

## File Structure

```
flutter_implementation/
├── main.dart                           # App entry point
├── models/
│   ├── category_model.dart             # Category data models
│   └── table_data_model.dart           # Table and comparison data models
├── services/
│   └── api_service.dart                # API service for backend communication
├── screens/
│   ├── home_page.dart                  # Main home page
│   ├── category_selection_screen.dart  # Category selection with subcategories
│   └── category_table_screen.dart      # Excel-like table view
└── widgets/
    ├── category_button.dart            # Category button widget
    ├── expandable_category_widget.dart # Expandable category list item
    └── comparison_widget.dart          # Comparison dialog widget
```

## Backend API Endpoints Used

### 1. Get Recent Reports
```
GET /api/reports?page=1&limit=5
```

### 2. Get All Categories
```
GET /api/reports/categories
```
Returns all unique categories with their subcategories.

### 3. Get Category Table Data
```
GET /api/reports/category-table-data?category=Blood Test&subCategory=CBC
```
Returns table data with parameters as rows and dates as columns.

### 4. Compare Date Data
```
GET /api/history/compare-dates?category=Blood Test&subCategory=CBC&date1=2024-01-15&date2=2024-02-15
```
Returns comparison between two dates for the specified category/subcategory.

## Setup Instructions

### 1. Add Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  intl: ^0.18.1  # For date formatting (optional)
```

### 2. Update API Base URL

In `services/api_service.dart`, update the `baseUrl` constant:

```dart
static const String baseUrl = 'http://your-backend-url:3000/api';
```

For local development:
- Android Emulator: `http://10.0.2.2:3000/api`
- iOS Simulator: `http://localhost:3000/api`
- Physical Device: `http://YOUR_COMPUTER_IP:3000/api`

### 3. Authentication

After user login, set the JWT token:

```dart
import 'services/api_service.dart';

// After successful login
ApiService.setAuthToken(jwtToken);
```

### 4. Run the App

```bash
flutter pub get
flutter run
```

## Usage Flow

1. **Home Page**
   - User sees recent reports
   - User taps on "Lab Reports" or "Image Reports" button

2. **Category Selection**
   - User sees list of categories
   - User taps to expand a category
   - User taps on a subcategory or "View All"

3. **Table View**
   - User sees excel-like table with parameters and dates
   - User can scroll horizontally to see more dates
   - User can tap the comparison button

4. **Comparison Mode**
   - User selects 2 dates by clicking on column headers
   - User taps the checkmark button to compare
   - Comparison dialog shows detailed comparison

## Customization

### Colors

Update the theme in `main.dart`:

```dart
theme: ThemeData(
  primarySwatch: Colors.blue, // Change primary color
  // ... other theme properties
),
```

### Icons

Change category button icons in `home_page.dart`:

```dart
CategoryButton(
  title: 'Lab Reports',
  icon: Icons.science_outlined, // Change icon here
  color: Colors.blue,           // Change color here
  onTap: () => _navigateToCategory('Lab Reports'),
),
```

## Notes

- All API calls require authentication (JWT token in Authorization header)
- Error handling is implemented for all network requests
- Pull-to-refresh is available on home page and category selection
- The comparison always uses the older date as baseline
- Status colors are consistent throughout the app

## Future Enhancements

- Add filters (date range, test type)
- Export comparison report as PDF
- Add charts/graphs for parameter trends
- Push notifications for new reports
- Offline support with local caching
- Share reports with doctors

## Troubleshooting

### API Connection Issues
- Verify backend is running
- Check the API base URL
- Ensure authentication token is set
- Check network permissions in AndroidManifest.xml and Info.plist

### Build Issues
- Run `flutter clean`
- Run `flutter pub get`
- Check Flutter version compatibility

### UI Layout Issues
- Test on different screen sizes
- Adjust responsive breakpoints if needed

## Support

For backend API documentation, see:
- API_REFERENCE.md
- QUICKSTART.md
- README.md

## License

This implementation is part of the MedTrack project.
