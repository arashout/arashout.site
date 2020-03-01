---
layout: post
title: PL/pgSQL - Converting Reverse IP Pointer Records
permalink: posts/plpgsql-reverse-ip
tags: ['sql', 'postgres', 'procedural']
published: false
---

# pl/pgSQL (Procedural SQL!)
I recently learned about about a SQL langauge extension available in Postgres called "pl/pgSQL".     
It let's you write procedural statements inside an SQL function!   
This is really great for when sometimes you need to write one-off migration scripts that might be convuloted.    
Writing it using pure SQL might make it needlessly complex or requiredeep knowledge of SQL to write elegantly.   
     
    
# An Interesting Problem (Maybe): IPv4 reverse -> INET
The [Postgres documentation is here](https://www.postgresql.org/docs/9.2/plpgsql.html), but it can be a little dry.   
So instead let's write a function that validates/converts an ["Reverse DNS Pointer Record"](https://en.wikipedia.org/wiki/Reverse_DNS_lookup) like `4.4.8.8.in-addr.arpa` into an Postgres's `INET` type with the correct [CIDR](https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing),which will allow to learn the features pl/pgSQL along the way.        

## Examples
The table below demonstrates what we are trying to achieve:    

rev_ip|expected_inet|
|---|---|
"16.172.in-addr.arpa."|"172.16.0.0/16"
"69.168.192.in-addr.arpa."|192.168.69.0/24"
"10.69.168.192.in-addr.arpa."|"192.168.69.10"
"10.in-addr.arpa."|"10.0.0.0/8"
"10.10.in-addr.arpa."|"10.10.0.0/16"
"10.10.10.in-addr.arpa."|"10.10.10.0/24"
"10.10.10.10.in-addr.arpa."|"10.10.10.10"
"255.255.255.255.in-addr.arpa."|"255.255.255.255"
"0.in-addr.arpa."|"0.0.0.0/8"
"256.in-addr.arpa."|
"254.254.254.256.in-addr.arpa."|
"9000.10.10.in-addr.arpa."|
".in-addr.arpa."|
"wrong.in-addr.arpa."|
"wrong.wrong.in-addr.arpa."|
"10.10.in-addr.arpa.com"|
"foo.in-addr.arpanet.com"|
"9999999999999999999999999999999999999999999999.in-addr.arpanet."|

[SQL Fiddle](http://sqlfiddle.com/#!17/f59ea4/1/0)   
NOTE: Unfortunately SQL Fiddle does not seem to support pl/pgSQL, so you will have to test the function in an actual instance of Postgres

## High Level Overview
Below is the high level overview of what our function will do to convert     
`69.168.192.in-addr.arpa.`->`192.168.69.0/24`

### Algorithm
1. Use "Regular Expression" to validate that we are indeed dealing with a reversed IPv4, and capture the [octets](https://en.wikipedia.org/wiki/Octet_(computing)#Use_in_internet_protocol_addresses)    
e.g. `69.168.192.in-addr.arpa.` -> [69, 168, 192, NULL]
2. Loop through the array of octets
    - Break if the octet is NULL
    - Validate that it is a number between 0-255 (inclusive)
    - Append the octet to a string in reversed order
3. Add the CIDR mask based on the number of octets captured in Step 1
4. Use Postgres's built in `INET` type to convert our `TEXT` into `INET`
## Step-by-Step (Snippets)
### Function Declaration
```sql
CREATE OR REPLACE FUNCTION rev_to_forward_ipv4(ipv4 TEXT) RETURNS INET AS $$ 
-- Function implementation goes here
$$ LANGUAGE PLPGSQL IMMUTABLE;
```
Most of the function declaration is fairly standard SQL, however there are a couple interesting parts:      
- Using `LANGUAGE PLPGSQL` declares that we will be using the PL/PGSQL syntax
- The `IMMUTABLE` keyword tells Postgres engine that our function is a "pure" function that has no side-effects (Doesn't touch the database) and produces the same output given the same input everytime. This allows the optimizer to pre-evaluate/cache results it has already calculated.      
### Variable Declaration
```sql
CREATE OR REPLACE FUNCTION rev_to_forward_ipv4(ipv4 TEXT) RETURNS INET AS $$ 
-- NEW CODE
DECLARE
	octets TEXT[4];
	octet TEXT;
	inet_string CITEXT := '';
	num_octets INTEGER := 0;
	n INTEGER;
-- ...
$$ LANGUAGE PLPGSQL IMMUTABLE;
```
When using PL/PGSQL we need to declare
## Full Source

# Appendix
## SQL Setup
```sql
DROP TABLE IF EXISTS reverse_ipv4;
CREATE TABLE IF NOT EXISTS reverse_ipv4 (
	rev_ip TEXT PRIMARY KEY,
    expected_inet INET
);

INSERT INTO reverse_ipv4 (rev_ip, expected_inet) VALUES 
	('10.in-addr.arpa.', '10.0.0.0/8'::INET),
	('10.10.in-addr.arpa.', '10.10.0.0/16'::INET),
	('10.10.10.in-addr.arpa.', '10.10.10.0/24'::INET),
	('10.10.10.10.in-addr.arpa.', '10.10.10.10'::INET),
	('255.255.255.255.in-addr.arpa.', '255.255.255.255'::INET),
	('0.in-addr.arpa.', '0.0.0.0/8'::INET),
	('256.in-addr.arpa.', NULL),
	('254.254.254.256.in-addr.arpa.', NULL),
	('9000.10.10.in-addr.arpa.', NULL),
	('.in-addr.arpa.', NULL),
	('wrong.in-addr.arpa.', NULL),
	('wrong.wrong.in-addr.arpa.', NULL),
	('10.10.in-addr.arpa.com', NULL),
	('foo.in-addr.arpanet.com', NULL),
	('9999999999999999999999999999999999999999999999.in-addr.arpanet.', NULL)
	ON CONFLICT DO NOTHING;
```