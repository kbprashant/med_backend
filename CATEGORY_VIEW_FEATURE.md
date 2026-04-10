# Medical Reports Category View Feature

## Overview

This feature adds a comprehensive category-based view for medical reports with an excel-like table display and comparison functionality. Users can view their test results organized by categories and subcategories, with dates as columns for easy tracking over time.

## Features Implemented

### 1. Backend API Endpoints

#### New Report Endpoints

**GET /api/reports/categories**
- Returns all unique test categories with their subcategories
- Organized from the user's test results
- Example response:
  ```json
  {
    "categories": [
      {
        "category": "Blood Test",
        "subCategories": ["CBC", "Hemoglobin", "WBC Count"]
      }
    ]
  }
  ```

**GET /api/reports/category-table-data**
- Query params: `category` (required), `subCategory` (optional)
- Returns test data in table format:
  - Parameters as rows
  - Dates as columns
  - Summary row with statistics
- Perfect for displaying excel-like views

#### New History Endpoint

**GET /api/history/compare-dates**
- Query params: `category`, `subCategory` (optional), `date1`, `date2`
- Compares test results between two dates
- Always uses older date as baseline
- Returns:
  - Change amount and percentage
  - Trend (increased/decreased/stable)
  - Interpretation of the change
  - Status for each date

### 2. Flutter Frontend Implementation

#### Screens

1. **Home Page** (`screens/home_page.dart`)
   - Recent reports section (horizontal scrollable)
   - Two category buttons (Lab Reports, Image Reports)
   - Clean, modern UI with gradient backgrounds

2. **Category Selection Screen** (`screens/category_selection_screen.dart`)
   - Lists all categories
   - Expandable to show subcategories
   - "View All" option for each category
   - Pull-to-refresh support

3. **Category Table Screen** (`screens/category_table_screen.dart`)
   - Excel-like table with:
     - Parameters in rows
     - Dates in columns
     - Color-coded status indicators
     - Horizontal scrolling
   - Comparison mode with checkbox selection
   - Summary row with statistics

#### Widgets

1. **Category Button** (`widgets/category_button.dart`)
   - Large, visually appealing buttons
   - Gradient backgrounds
   - Custom icons and colors

2. **Expandable Category Widget** (`widgets/expandable_category_widget.dart`)
   - Animated expansion/collapse
   - "View All" button
   - Subcategory list with selection

3. **Comparison Widget** (`widgets/comparison_widget.dart`)
   - Full-screen dialog
   - Side-by-side comparison
   - Trend indicators with icons
   - Color-coded status
   - Interpretation messages

#### Models

- `category_model.dart` - Category data structures
- `table_data_model.dart` - Table and comparison data structures

#### Services

- `api_service.dart` - All API calls with authentication

## User Flow

```
Home Page
    ↓
[Lab Reports] or [Image Reports] Button
    ↓
Category Selection Screen
    ↓
Tap on Category to Expand
    ↓
Select Subcategory or "View All"
    ↓
Category Table Screen (Excel-like view)
    ↓
[Optional] Tap Comparison Button
    ↓
Select 2 Date Columns (checkboxes appear)
    ↓
Tap Checkmark to Compare
    ↓
Comparison Dialog (detailed comparison)
```

## Excel-Like Table Structure

```
┌─────────────────┬─────────────┬─────────────┬─────────────┐
│ Parameter       │ 2024-01-15  │ 2024-02-15  │ 2024-03-15  │
│                 │ [Checkbox]  │ [Checkbox]  │ [Checkbox]  │  ← Only in comparison mode
├─────────────────┼─────────────┼─────────────┼─────────────┤
│ Hemoglobin      │   14.5      │   15.2      │   14.8      │
│ g/dL            │   NORMAL    │   NORMAL    │   NORMAL    │
│ Ref: 13-17      │   [green]   │   [green]   │   [green]   │
├─────────────────┼─────────────┼─────────────┼─────────────┤
│ WBC Count       │   7500      │   8200      │   12000     │
│ cells/μL        │   NORMAL    │   NORMAL    │   HIGH      │
│ Ref: 4000-11000 │   [green]   │   [green]   │   [red]     │
├─────────────────┼─────────────┼─────────────┼─────────────┤
│ Summary         │  ✓ 3 ⚠ 0   │  ✓ 3 ⚠ 0   │  ✓ 2 ⚠ 1   │
│                 │  Total: 3   │  Total: 3   │  Total: 3   │
└─────────────────┴─────────────┴─────────────┴─────────────┘
```

## Comparison Feature

### How It Works

1. User taps the comparison button (compare_arrows icon) in app bar
2. Table enters comparison mode:
   - Banner appears explaining the feature
   - Checkboxes appear in date column headers
   - Counter shows "X/2 selected"
3. User clicks on 2 date columns to select them
   - Columns highlight when selected
   - Border color changes to primary color
   - Can only select 2 columns maximum
4. Checkmark button appears when 2 dates selected
5. User taps checkmark to perform comparison
6. Comparison dialog shows:
   - Old vs New values side by side
   - Change amount (e.g., +0.7)
   - Percentage change (e.g., +4.83%)
   - Trend icon and indicator
   - Interpretation message
   - Color-coded status

### Comparison Logic

- **Always uses older date as baseline**
- Calculates: `change = newer_value - older_value`
- Calculates: `percent_change = (change / older_value) * 100`
- Determines trend:
  - `increased` - value went up
  - `decreased` - value went down
  - `stable` - no change
  - `not_comparable` - parameter only tested on one date

### Interpretation Messages

- "No change" - Values identical
- "Both values within normal range" - Both NORMAL
- "Improved to normal range" - Changed from abnormal to NORMAL
- "Moved out of normal range - needs attention" - Changed from NORMAL to abnormal
- "Increased" / "Decreased" - General change
- "Parameter only tested on one date" - Not comparable

## Color Coding

### Status Colors
- **Green** - NORMAL values
- **Red** - HIGH values
- **Orange** - LOW values
- **Grey** - N/A or missing data

### UI Colors
- **Primary Blue** - Category buttons, selections, headers
- **Purple** - Image reports button
- **Amber** - Interpretation/insights sections

## Setup Instructions

### Backend

1. The new endpoints are already integrated into the existing backend
2. Routes are added to:
   - `routes/reportRoutes.js`
   - `routes/historyRoutes.js`
3. Controllers are updated:
   - `controllers/reportController.js` - Added `getCategories`, `getCategoryTableData`
   - `controllers/historyController.js` - Added `compareDateData`

### Flutter

1. Copy `flutter_implementation` folder to your Flutter project
2. Update `pubspec.yaml` with dependencies:
   ```yaml
   dependencies:
     http: ^1.1.0
     intl: ^0.18.1
   ```
3. Update API base URL in `services/api_service.dart`:
   ```dart
   static const String baseUrl = 'http://your-backend:3000/api';
   ```
4. Set JWT token after login:
   ```dart
   ApiService.setAuthToken(jwtToken);
   ```
5. Run:
   ```bash
   flutter pub get
   flutter run
   ```

## Testing

### Backend Testing

Test the new endpoints with curl or Postman:

```bash
# Get categories
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/reports/categories

# Get table data
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/reports/category-table-data?category=Blood%20Test&subCategory=CBC"

# Compare dates
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/history/compare-dates?category=Blood%20Test&date1=2024-01-15&date2=2024-02-15"
```

### Frontend Testing

1. Test different screen sizes (phones, tablets)
2. Test with various amounts of data (few dates, many dates)
3. Test comparison with:
   - Normal → Normal values
   - Normal → Abnormal values
   - Abnormal → Normal values
   - Missing data on one date
4. Test error scenarios (network issues, empty data)

## Customization

### Change Category Types

In `home_page.dart`, modify the category buttons:

```dart
CategoryButton(
  title: 'Your Category Name',
  icon: Icons.your_icon,
  color: Colors.yourColor,
  onTap: () => _navigateToCategory('Your Category Name'),
),
```

### Change Colors

In `main.dart`, modify the theme:

```dart
theme: ThemeData(
  primarySwatch: Colors.blue, // Change primary color
  // ... other theme properties
),
```

### Filter Categories

In `category_selection_screen.dart`, add filtering logic:

```dart
// Filter categories based on type
setState(() {
  _categories = response.categories.where((cat) {
    // Add your filtering logic
    if (widget.categoryType == 'Lab Reports') {
      return cat.category.contains('Test') || cat.category.contains('Profile');
    }
    return true;
  }).toList();
});
```

## API Documentation

See `API_REFERENCE.md` for complete API documentation including:
- Request/response formats
- Query parameters
- Error responses
- Examples

## Future Enhancements

- Export comparison as PDF
- Add date range filters
- Chart/graph view for trends
- Share reports with doctors
- Offline support with caching
- Push notifications
- Multiple comparison (more than 2 dates)
- Printing support
- Dark mode

## Troubleshooting

### "No categories available"
- Ensure user has uploaded reports
- Check that testCategory and testSubCategory are set when uploading reports
- Verify API authentication

### "Failed to load table data"
- Check network connectivity
- Verify category/subcategory names match exactly
- Check backend logs for errors

### Comparison not working
- Ensure exactly 2 dates are selected
- Verify both dates have data
- Check that category/subcategory parameters are correct

### Table scrolling issues
- Test on different screen sizes
- Ensure SingleChildScrollView is properly nested
- Check DataTable column widths

## Support

For issues or questions:
1. Check backend logs: `node server.js`
2. Check Flutter console for errors
3. Verify API responses with curl/Postman
4. Review API_REFERENCE.md for endpoint details

## License

Part of the MedTrack project.
