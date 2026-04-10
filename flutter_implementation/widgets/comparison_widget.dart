import 'package:flutter/material.dart';
import '../models/table_data_model.dart';

class ComparisonDialog extends StatelessWidget {
  final ComparisonResponse comparison;

  const ComparisonDialog({
    super.key,
    required this.comparison,
  });

  Color _getTrendColor(String trend) {
    switch (trend.toLowerCase()) {
      case 'increased':
        return Colors.red;
      case 'decreased':
        return Colors.orange;
      case 'stable':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  Icon _getTrendIcon(String trend) {
    switch (trend.toLowerCase()) {
      case 'increased':
        return const Icon(Icons.trending_up, color: Colors.red);
      case 'decreased':
        return const Icon(Icons.trending_down, color: Colors.orange);
      case 'stable':
        return const Icon(Icons.trending_flat, color: Colors.green);
      default:
        return const Icon(Icons.remove, color: Colors.grey);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        height: MediaQuery.of(context).size.height * 0.8,
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Comparison Report',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        comparison.category +
                            (comparison.subCategory != null
                                ? ' - ${comparison.subCategory}'
                                : ''),
                        style: const TextStyle(
                          fontSize: 16,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const Divider(),
            // Date comparison info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      const Text(
                        'Older Date',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatDate(comparison.olderDate),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const Icon(Icons.arrow_forward, size: 32),
                  Column(
                    children: [
                      const Text(
                        'Newer Date',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatDate(comparison.newerDate),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            // Comparison results
            Expanded(
              child: ListView.builder(
                itemCount: comparison.comparison.length,
                itemBuilder: (context, index) {
                  final item = comparison.comparison[index];
                  return _buildComparisonCard(item);
                },
              ),
            ),
            // Close button
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.all(16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Close',
                  style: TextStyle(fontSize: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildComparisonCard(ComparisonData item) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Parameter name
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.parameter,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                _getTrendIcon(item.trend),
              ],
            ),
            if (item.unit != null)
              Text(
                'Unit: ${item.unit}',
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
            if (item.referenceRange != null)
              Text(
                'Reference: ${item.referenceRange}',
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.blue,
                ),
              ),
            const SizedBox(height: 12),
            // Values comparison
            Row(
              children: [
                // Older value
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: item.olderDate != null
                          ? _getStatusColor(item.olderDate!.status)
                              .withOpacity(0.1)
                          : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: item.olderDate != null
                            ? _getStatusColor(item.olderDate!.status)
                            : Colors.grey,
                      ),
                    ),
                    child: Column(
                      children: [
                        const Text(
                          'Old',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.olderDate?.value ?? '-',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (item.olderDate != null)
                          Text(
                            item.olderDate!.status,
                            style: TextStyle(
                              fontSize: 12,
                              color: _getStatusColor(item.olderDate!.status),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                // Arrow with change
                Column(
                  children: [
                    Icon(
                      Icons.arrow_forward,
                      color: _getTrendColor(item.trend),
                    ),
                    if (item.change != null)
                      Text(
                        item.change! > 0 ? '+${item.change}' : '${item.change}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: _getTrendColor(item.trend),
                        ),
                      ),
                    if (item.percentChange != null)
                      Text(
                        '${item.percentChange! > 0 ? '+' : ''}${item.percentChange!.toStringAsFixed(1)}%',
                        style: TextStyle(
                          fontSize: 12,
                          color: _getTrendColor(item.trend),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 16),
                // Newer value
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: item.newerDate != null
                          ? _getStatusColor(item.newerDate!.status)
                              .withOpacity(0.1)
                          : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: item.newerDate != null
                            ? _getStatusColor(item.newerDate!.status)
                            : Colors.grey,
                      ),
                    ),
                    child: Column(
                      children: [
                        const Text(
                          'New',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.newerDate?.value ?? '-',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (item.newerDate != null)
                          Text(
                            item.newerDate!.status,
                            style: TextStyle(
                              fontSize: 12,
                              color: _getStatusColor(item.newerDate!.status),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Interpretation
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.lightbulb_outline,
                    size: 20,
                    color: Colors.orange,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      item.interpretation,
                      style: const TextStyle(
                        fontSize: 14,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
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

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateStr;
    }
  }
}
