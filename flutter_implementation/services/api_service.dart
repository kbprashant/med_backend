import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/category_model.dart';
import '../models/table_data_model.dart';

class ApiService {
  // Update this with your backend URL
  static const String baseUrl = 'http://localhost:3000/api';
  
  // Store JWT token (should be managed by authentication service)
  static String? _authToken;
  
  static void setAuthToken(String token) {
    _authToken = token;
  }
  
  static Map<String, String> _getHeaders() {
    return {
      'Content-Type': 'application/json',
      if (_authToken != null) 'Authorization': 'Bearer $_authToken',
    };
  }

  // Get all categories with subcategories
  static Future<CategoriesResponse> getCategories() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/reports/categories'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return CategoriesResponse.fromJson(data);
      } else {
        throw Exception('Failed to load categories: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching categories: $e');
    }
  }

  // Get table data for a specific category/subcategory
  static Future<TableDataResponse> getCategoryTableData({
    required String category,
    String? subCategory,
  }) async {
    try {
      final queryParams = {
        'category': category,
        if (subCategory != null && subCategory.isNotEmpty) 
          'subCategory': subCategory,
      };

      final uri = Uri.parse('$baseUrl/reports/category-table-data')
          .replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return TableDataResponse.fromJson(data);
      } else {
        throw Exception('Failed to load table data: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching table data: $e');
    }
  }

  // Compare data between two dates
  static Future<ComparisonResponse> compareDateData({
    required String category,
    String? subCategory,
    required String date1,
    required String date2,
  }) async {
    try {
      final queryParams = {
        'category': category,
        if (subCategory != null && subCategory.isNotEmpty) 
          'subCategory': subCategory,
        'date1': date1,
        'date2': date2,
      };

      final uri = Uri.parse('$baseUrl/history/compare-dates')
          .replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return ComparisonResponse.fromJson(data);
      } else {
        throw Exception('Failed to load comparison: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching comparison: $e');
    }
  }

  // Get recent reports (for displaying in home page)
  static Future<List<dynamic>> getRecentReports({int limit = 5}) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/reports?page=1&limit=$limit'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['reports'] as List<dynamic>;
      } else {
        throw Exception('Failed to load recent reports: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching recent reports: $e');
    }
  }
}
