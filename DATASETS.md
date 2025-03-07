# Sample Datasets for MDAA Solutions

This document provides guidance on obtaining and setting up sample datasets to test the MDAA solution.

### Option 1: Using Public Sample Datasets
1. Visit [Any sample CSV files](https://github.com/datablist/sample-csv-files)
2. Download CSV files appropriate for your testing needs

### Option 2: Using Custom Dimension Tables
For specific MDAA examples, you can create these custom dimension tables:
```csv
# yellow_tripdata_dim_payment.csv

"PaymentID","Payment_type"
"1","Credit card"
"2","Cash"
"3","No charge"
"4","Dispute"
"5","Unknown"
"6","Voided trip"
```

```csv
# yellow_trip_data_dim_vendor.csv

"VendorID","VendorName"
"1","Creative Mobile Technologies"
"2","VeriFone Inc"
"3","test"
```

### Setup Instructions
1. Create a `sample_data` directory in your project:
Structure it as below:
```bash
mkdir -p sample_data/<dataset_name>/<csv_file_name>
```
Example: 
```bash
mkdir -p sample_data/yellow_tripdata_dim_payment/yellow_tripdata_dim_payment.csv
```
