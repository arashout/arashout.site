---
layout: post
title: Python's csv.DictReader for easy field by field comparisons
permalink: posts/field_by_field_comparison_with_dictreader
published: true
tags: ['python', 'tools']
---

# Scenario
I recently had to write a script for finding the differences between two CSVs but there were some caveats that made using the traditional csv reader or set of tools annoying.
- It wasn't a line by line comparison. The CSV could potentially be missing over half of the data
- The columns often didn't line-up. e.g. They would be in the wrong order or missing
    - This makes using number based column indexing impossible 😞 

Before reaching for [`pandas`](https://pandas.pydata.org/), I didn't to do a quick stack-overflow search to see if anything a little simpler existed. **This is something I wanted to show to someone who is just starting to learn Python so I didn't want to confuse them too much by throwing in industrial grade library with it's own semantics at them.**  

I found a post on StackOverflow (Can't find it now...) which recommended using [`csv.DictReader`](https://docs.python.org/3/library/csv.html#csv.DictReader). What an amazing find! I love the Python standard library 😃 .

## Additional Context
The exact scenario involved checking if a bunch of data from the test environment had been properly imported into the production environment.   
The developer know that a bunch of items would be missing or incorrect in the production environment but wanted to understand which records/fields needed fixing.    
Thus the variable names involving `test` and `prod` below. Basically `test` is the source of truth.   

# The Code
## Basics
With `csv.DictReader` I can read the CSV's and determine the columns based on the header row
```python
import csv

in_t = 'input_test.csv'
in_p = 'input_prod.csv'

with open(in_t, newline='', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    # Easy way of getting data into a list. 
    # Specifically List[Dict[str, Any]]
    data_t = list(reader) 

with open(in_p, newline='',  encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    data_p = list(reader)

columns = list(data_t[0].keys()) # Columns based on first row (header row)
```

## Finding Missing Rows
The CSVs share column that is the primary key. So we can use that to find the differences using simple set operations.
```python
PRIMARY_KEY = 'primary_key_column'
codes_t = set()
codes_p = set()
for row in data_t:
    codes_t.add(row[PRIMARY_KEY])

for row in data_p:
    codes_p.add(row[PRIMARY_KEY])

print("Missing {0} from prod".format(len(codes_t.difference(codes_p))))
print("Missing {0} from test".format(len(codes_p.difference(codes_t))))
with open('missing_prod.csv', 'w') as f:
    f.write('\n'.join(codes_t.difference(codes_p)))
with open('missing_test.csv', 'w') as f:
    f.write('\n'.join(codes_p.difference(codes_t)))
```

## Finding Differences
For the data with the same primary key in both CSV's we want to do a field by field comparison. This is where the power of `csv.DictReader` shines.

```python
# Helper method for finding the row we are looking for.
# Could have been more efficient if I stored it in hash-set but the CSVs are pretty small
def find_row_by_code(c: str, rows: list) -> dict:
    for row in rows:
        if c == row[PRIMARY_KEY]:
            return row
    raise ValueError("code {} not found".format(c))

# Use set operations to find common rows
codes_in_both = codes_t.intersection(codes_p)
print("{0} codes in both test and prod".format(len(codes_in_both)))

# defaultdict for collecting the differences in EACH field
from collections import defaultdict
differences = defaultdict(list)

# Some columns that I don't care about...
ignored_columns = ["updated_at"]

# Go over each common code and find the differences and collect them in Dictionary
for code in codes_in_both:
    row_t = find_row_by_code(code, data_t)
    row_p = find_row_by_code(code, data_p)
    # Here is the row by row comparison
    for col in columns:        
        if col in ignored_columns:
            continue

        if row_t[col] != row_p[col]:
            differences[code].append(col)
```

## Print out the Differences
```python
def get_column_values_for_code(code: str, data: list, columns: list) -> list:
    values = []
    row = find_row_by_code(code, data)
    for col in columns:
        values.append(row[col])
    return values

print("{} rows have different values between prod and test".format(len(differences)))
with open('different_values.csv', 'w') as f:
    for code, different_columns in differences.items():
        # NOTE: I'm 'printing' to a FILE
        print("env\t{}".format("\t".join(['code'] + different_columns)), file=f)
        print("prod\t{}".format("\t".join([code] + get_column_values_for_code(code, data_p, different_columns))), file=f)
        print("test\t{}".format("\t".join([code] + get_column_values_for_code(code, data_t, different_columns))), file=f)
```

# Example
Here is the output given the following CSV documents:
## Input 
```csv
code,firstname,lastname,description,updated_at
a836116b-7efc-485b-b456-78943e3e9502,Clementine,Howlyn,rurOsIYeXrIm,2019-11-04
18babe33-9fb5-474e-af87-2f9d6900189b,Lusa,Lytton,GHqBuTnnKuC,2019-10-14
f9facfca-1696-4e15-b83a-0bc013cb2fca,Jerry,Niles,QDArvCYSnHp PXwhGaGl,2019-06-06
a1c9200e-655a-4eb2-a100-a87d0862ec05,Ermengarde,Bearnard,HZiPKaFXNcrQHUuK,2019-09-23
e23f1926-fcf9-41e0-b66d-7cfc9fd413da,Keelia,Bohlin,BdkJfBdUyKAoV,2019-12-01
c9a07378-f62b-4406-8133-3129b7eb2b1c,Diena,Klemperer,ctDgOBIClzSog,2019-09-17
e289f02e-8e7d-4276-9003-d097b8b4b65d,Cindelyn,Vernier,vnaZHJpsgHSezIhw,2019-10-23
09765ca2-b290-4888-888c-3537801dab53,Annora,Esmaria,hDNu SCSyzFVzthzGO,2019-04-20
1fdea7c9-423e-48e6-bc48-66c410fb74a9,Emmey,Emanuel,"zPjAqpSDIlIh ",2019-01-02
e0c54161-89f3-4124-b807-d6926ef282dd,Pamella,Halsey,tQxqUgXdtlXrXUFX,2019-02-21
```

```csv
code,firstname,lastname,description,updated_at
a836116b-7efc-485b-b456-78943e3e9502,Clementine,Howlyn,rurOsIYeXrIm,2019-11-04
18babe33-9fb5-474e-af87-2f9d6900189b,Lusa,Lytton,GHqBuTnnKuCaa,2019-10-14
a1c9200e-655a-4eb2-a100-a87d0862ec05,Ermengarde,Bearnard,HZiPKaFXNcrQHUuK,2019-09-23
e23f1926-fcf9-41e0-b66d-7cfc9fd413da,Keelia,Bohlin,BdkJfBdUyKAoV,2019-12-01
09765ca2-b290-4888-888c-3537801dab53,Annora,Esmaria,hDNu SCSyzFVzthzGO,2019-04-20
1fdea7c9-423e-48e6-bc48-66c410fb74a9,Emmey,Emanuel,"zPjAqpSDIlIhbb ",2019-01-02
e0c54161-89f3-4124-b807-d6926ef282dd,Pamella,Halsey,tQxqUgXdtlXrXUFX,2019-02-21
```

## Ouput
```
> python3 csv_comparison.py
Missing 3 from prod
Missing 0 from test
7 codes in both test and prod
2 rows have different values between prod and test
```

### missing_prod.csv
```
e289f02e-8e7d-4276-9003-d097b8b4b65d
c9a07378-f62b-4406-8133-3129b7eb2b1c
f9facfca-1696-4e15-b83a-0bc013cb2fca
```

### different_values.csv
```csv
env	code	description
prod	18babe33-9fb5-474e-af87-2f9d6900189b	GHqBuTnnKuCaa
test	18babe33-9fb5-474e-af87-2f9d6900189b	GHqBuTnnKuC
env	code	description
prod	1fdea7c9-423e-48e6-bc48-66c410fb74a9	zPjAqpSDIlIhbb 
test	1fdea7c9-423e-48e6-bc48-66c410fb74a9	zPjAqpSDIlIh 

```