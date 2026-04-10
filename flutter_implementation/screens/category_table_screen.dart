import 'package:flutter/material.dart';
import '../models/table_data_model.dart';
import '../services/api_service.dart';
import '../widgets/comparison_widget.dart';

class CategoryTableScreen extends StatefulWidget {
  final String category;
  final String? subCategory;

  const CategoryTableScreen({
    super.key,
    required this.category,
    this.subCategory,
  });

  @override
  State<CategoryTableScreen> createState() => _CategoryTableScreenState();
}

class _CategoryTableScreenState extends State<CategoryTableScreen> {
  TableDataResponse? _tableData;
  bool _isLoading = true;
  String? _error;
  bool _isComparisonMode = false;
  final Set<int> _selectedColumns = {};
  ComparisonResponse? _comparisonData;

  @override
  void initState() {
    super.initState();
    _loadTableData();
  }

  Future<void> _loadTableData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await ApiService.getCategoryTableData(
        category: widget.category,
        subCategory: widget.subCategory,
      );

      setState(() {
        _tableData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _toggleComparisonMode() {
    setState(() {
      _isComparisonMode = !_isComparisonMode;
      _selectedColumns.clear();
      _comparisonData = null;
    });
  }

  void _toggleColumnSelection(int columnIndex) {
    setState(() {
      if (_selectedColumns.contains(columnIndex)) {
        _selectedColumns.remove(columnIndex);
      } else {
        if (_selectedColumns.length < 2) {
          _selectedColumns.add(columnIndex);
        } else {
          // Show message: can only select 2 columns
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('You can only select 2 dates to compare'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    });
  }

  Future<void> _performComparison() async {
    if (_selectedColumns.length != 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select exactly 2 dates to compare'),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    final dates = _tableData!.dates;
    final selectedIndices = _selectedColumns.toList()..sort();
    final date1 = dates[selectedIndices[0]];
    final date2 = dates[selectedIndices[1]];

    try {
      setState(() {
        _isLoading = true;
      });

      final comparison = await ApiService.compareDateData(
        category: widget.category,
        subCategory: widget.subCategory,
        date1: date1,
        date2: date2,
      );

      setState(() {
        _comparisonData = comparison;
        _isLoading = false;
      });

      // Show comparison dialog or navigate to comparison screen
      _showComparisonDialog(comparison);
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showComparisonDialog(ComparisonResponse comparison) {
    showDialog(
      context: context,
      builder: (context) => ComparisonDialog(comparison: comparison),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'NORMAL':
        return Colors.green;
      case 'HIGH':
        return Colors.red;
      case 'LOW':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.category),
            if (widget.subCategory != null)
              Text(
                widget.subCategory!,
                style: const TextStyle(fontSize: 14),
              ),
          ],
        ),
        actions: [
          if (_tableData != null && _tableData!.dates.isNotEmpty)
            IconButton(
              icon: Icon(_isComparisonMode ? Icons.close : Icons.compare_arrows),
              tooltip: _isComparisonMode
                  ? 'Exit Comparison Mode'
                  : 'Compare Dates',
              onPressed: _toggleComparisonMode,
            ),
          if (_isComparisonMode && _selectedColumns.length == 2)
            IconButton(
              icon: const Icon(Icons.check),
              tooltip: 'Compare Selected',
              onPressed: _performComparison,
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline,
                          size: 64, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(
                        'Error: $_error',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.red),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadTableData,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _tableData == null || _tableData!.tableData.isEmpty
                  ? const Center(
                      child: Text('No data available for this category'),
                    )
                  : _buildTable(),
    );
  }

  Widget _buildTable() {
    final data = _tableData!;

    return Column(
      children: [
        // Comparison mode banner
        if (_isComparisonMode)
          Container(
            padding: const EdgeInsets.all(12),
            color: Theme.of(context).primaryColor.withOpacity(0.1),
            child: Row(
              children: [
                const Icon(Icons.info_outline, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Comparison Mode: Select 2 dates by clicking on the date headers',
                    style: TextStyle(
                      fontSize: 14,
                      color: Theme.of(context).primaryColor,
                    ),
                  ),
                ),
                Text(
                  '${_selectedColumns.length}/2 selected',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
              ],
            ),
          ),
        // Scrollable table
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SingleChildScrollView(
              scrollDirection: Axis.vertical,
              child: _buildDataTable(data),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDataTable(TableDataResponse data) {
    // Calculate column width
    const double firstColumnWidth = 200;
    const double dataColumnWidth = 120;

    return DataTable(
      headingRowHeight: 60,
      horizontalMargin: 12,
      columnSpacing: 16,
      columns: [
        // Parameter column
        const DataColumn(
          label: SizedBox(
            width: firstColumnWidth,
            child: Text(
              'Parameter',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ),
        // Date columns
        ...data.dates.asMap().entries.map((entry) {
          final index = entry.key;
          final date = entry.value;
          final isSelected = _selectedColumns.contains(index);

          return DataColumn(
            label: InkWell(
              onTap: _isComparisonMode
                  ? () => _toggleColumnSelection(index)
                  : null,
              child: Container(
                width: dataColumnWidth,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Theme.of(context).primaryColor.withOpacity(0.2)
                      : null,
                  borderRadius: BorderRadius.circular(8),
                  border: isSelected
                      ? Border.all(
                          color: Theme.of(context).primaryColor,
                          width: 2,
                        )
                      : null,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (_isComparisonMode)
                      Checkbox(
                        value: isSelected,
                        onChanged: (value) => _toggleColumnSelection(index),
                      ),
                    Text(
                      _formatDate(date),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: isSelected
                            ? Theme.of(context).primaryColor
                            : Colors.black87,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ],
      rows: [
        // Parameter rows
        ...data.tableData.map((row) {
          return DataRow(
            cells: [
              // Parameter name cell
              DataCell(
                SizedBox(
                  width: firstColumnWidth,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        row.parameter,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      if (row.unit != null)
                        Text(
                          row.unit!,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                      if (row.referenceRange != null)
                        Text(
                          'Ref: ${row.referenceRange}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Colors.blue,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              // Value cells
              ...row.dateValues.map((dateValue) {
                return DataCell(
                  SizedBox(
                    width: dataColumnWidth,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _getStatusColor(dateValue.status)
                            .withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _getStatusColor(dateValue.status),
                          width: 1,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            dateValue.value,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: dateValue.value == '-'
                                  ? Colors.grey
                                  : Colors.black87,
                            ),
                          ),
                          if (dateValue.status != 'N/A' &&
                              dateValue.value != '-')
                            Text(
                              dateValue.status,
                              style: TextStyle(
                                fontSize: 10,
                                color: _getStatusColor(dateValue.status),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ],
          );
        }),
        // Summary row
        DataRow(
          color: WidgetStateProperty.all(
            Colors.blue.shade50,
          ),
          cells: [
            const DataCell(
              SizedBox(
                width: firstColumnWidth,
                child: Text(
                  'Summary',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
            ...data.summary.map((summary) {
              return DataCell(
                SizedBox(
                  width: dataColumnWidth,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '✓ ${summary.normalCount}',
                        style: const TextStyle(
                          color: Colors.green,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '⚠ ${summary.abnormalCount}',
                        style: const TextStyle(
                          color: Colors.red,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Total: ${summary.totalTests}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ],
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateStr;
    }
  }
}
