class DateValue {
  final String value;
  final String status;
  final String? id;

  DateValue({
    required this.value,
    required this.status,
    this.id,
  });

  factory DateValue.fromJson(Map<String, dynamic> json) {
    return DateValue(
      value: json['value'] as String,
      status: json['status'] as String,
      id: json['id'] as String?,
    );
  }
}

class TableRow {
  final String parameter;
  final String? unit;
  final double? normalMin;
  final double? normalMax;
  final String? referenceRange;
  final List<DateValue> dateValues;

  TableRow({
    required this.parameter,
    this.unit,
    this.normalMin,
    this.normalMax,
    this.referenceRange,
    required this.dateValues,
  });

  factory TableRow.fromJson(Map<String, dynamic> json) {
    return TableRow(
      parameter: json['parameter'] as String,
      unit: json['unit'] as String?,
      normalMin: json['normalMin'] != null 
          ? (json['normalMin'] as num).toDouble() 
          : null,
      normalMax: json['normalMax'] != null 
          ? (json['normalMax'] as num).toDouble() 
          : null,
      referenceRange: json['referenceRange'] as String?,
      dateValues: (json['dateValues'] as List<dynamic>)
          .map((e) => DateValue.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class SummaryData {
  final String date;
  final int normalCount;
  final int abnormalCount;
  final int totalTests;

  SummaryData({
    required this.date,
    required this.normalCount,
    required this.abnormalCount,
    required this.totalTests,
  });

  factory SummaryData.fromJson(Map<String, dynamic> json) {
    return SummaryData(
      date: json['date'] as String,
      normalCount: json['normalCount'] as int,
      abnormalCount: json['abnormalCount'] as int,
      totalTests: json['totalTests'] as int,
    );
  }
}

class TableDataResponse {
  final String category;
  final String? subCategory;
  final List<String> dates;
  final List<String> parameters;
  final List<TableRow> tableData;
  final List<SummaryData> summary;

  TableDataResponse({
    required this.category,
    this.subCategory,
    required this.dates,
    required this.parameters,
    required this.tableData,
    required this.summary,
  });

  factory TableDataResponse.fromJson(Map<String, dynamic> json) {
    return TableDataResponse(
      category: json['category'] as String,
      subCategory: json['subCategory'] as String?,
      dates: (json['dates'] as List<dynamic>).map((e) => e as String).toList(),
      parameters: (json['parameters'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      tableData: (json['tableData'] as List<dynamic>)
          .map((e) => TableRow.fromJson(e as Map<String, dynamic>))
          .toList(),
      summary: (json['summary'] as List<dynamic>)
          .map((e) => SummaryData.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ComparisonData {
  final String parameter;
  final String? unit;
  final String? referenceRange;
  final DateData? olderDate;
  final DateData? newerDate;
  final double? change;
  final double? percentChange;
  final String trend;
  final String interpretation;

  ComparisonData({
    required this.parameter,
    this.unit,
    this.referenceRange,
    this.olderDate,
    this.newerDate,
    this.change,
    this.percentChange,
    required this.trend,
    required this.interpretation,
  });

  factory ComparisonData.fromJson(Map<String, dynamic> json) {
    return ComparisonData(
      parameter: json['parameter'] as String,
      unit: json['unit'] as String?,
      referenceRange: json['referenceRange'] as String?,
      olderDate: json['olderDate'] != null
          ? DateData.fromJson(json['olderDate'] as Map<String, dynamic>)
          : null,
      newerDate: json['newerDate'] != null
          ? DateData.fromJson(json['newerDate'] as Map<String, dynamic>)
          : null,
      change: json['change'] != null ? (json['change'] as num).toDouble() : null,
      percentChange: json['percentChange'] != null
          ? (json['percentChange'] as num).toDouble()
          : null,
      trend: json['trend'] as String,
      interpretation: json['interpretation'] as String,
    );
  }
}

class DateData {
  final String date;
  final String value;
  final String status;

  DateData({
    required this.date,
    required this.value,
    required this.status,
  });

  factory DateData.fromJson(Map<String, dynamic> json) {
    return DateData(
      date: json['date'] as String,
      value: json['value'] as String,
      status: json['status'] as String,
    );
  }
}

class ComparisonResponse {
  final String category;
  final String? subCategory;
  final String olderDate;
  final String newerDate;
  final List<ComparisonData> comparison;

  ComparisonResponse({
    required this.category,
    this.subCategory,
    required this.olderDate,
    required this.newerDate,
    required this.comparison,
  });

  factory ComparisonResponse.fromJson(Map<String, dynamic> json) {
    return ComparisonResponse(
      category: json['category'] as String,
      subCategory: json['subCategory'] as String?,
      olderDate: json['olderDate'] as String,
      newerDate: json['newerDate'] as String,
      comparison: (json['comparison'] as List<dynamic>)
          .map((e) => ComparisonData.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
