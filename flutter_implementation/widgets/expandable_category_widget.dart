import 'package:flutter/material.dart';
import '../models/category_model.dart';

class ExpandableCategoryWidget extends StatefulWidget {
  final CategoryModel category;
  final Function(String category, String? subCategory) onSelected;

  const ExpandableCategoryWidget({
    super.key,
    required this.category,
    required this.onSelected,
  });

  @override
  State<ExpandableCategoryWidget> createState() =>
      _ExpandableCategoryWidgetState();
}

class _ExpandableCategoryWidgetState extends State<ExpandableCategoryWidget> {
  bool _isExpanded = false;
  String? _selectedSubCategory;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          // Category Header
          InkWell(
            onTap: () {
              setState(() {
                _isExpanded = !_isExpanded;
              });
            },
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(12),
              topRight: Radius.circular(12),
            ),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(12),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _isExpanded
                        ? Icons.keyboard_arrow_down
                        : Icons.keyboard_arrow_right,
                    color: Theme.of(context).primaryColor,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      widget.category.category,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).primaryColor,
                      ),
                    ),
                  ),
                  // Button to view all in this category
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _selectedSubCategory = null;
                      });
                      widget.onSelected(widget.category.category, null);
                    },
                    child: const Text('View All'),
                  ),
                ],
              ),
            ),
          ),
          // Subcategories List
          if (_isExpanded)
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              child: Column(
                children: widget.category.subCategories.map((subCategory) {
                  final isSelected = _selectedSubCategory == subCategory;
                  return ListTile(
                    leading: Icon(
                      Icons.circle,
                      size: 8,
                      color: isSelected
                          ? Theme.of(context).primaryColor
                          : Colors.grey,
                    ),
                    title: Text(
                      subCategory,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected
                            ? Theme.of(context).primaryColor
                            : Colors.black87,
                      ),
                    ),
                    selected: isSelected,
                    selectedTileColor:
                        Theme.of(context).primaryColor.withOpacity(0.05),
                    onTap: () {
                      setState(() {
                        _selectedSubCategory = subCategory;
                      });
                      widget.onSelected(widget.category.category, subCategory);
                    },
                    trailing: Icon(
                      Icons.arrow_forward_ios,
                      size: 16,
                      color: isSelected
                          ? Theme.of(context).primaryColor
                          : Colors.grey,
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }
}
