
# Candidate Preparation
To successfully complete the coding test the candidate will need access to an environment with the following installed:
1. [Node.js](https://nodejs.org/en)
2. [TypeScript.js](https://www.typescriptlang.org/download)
3. [Jest](https://www.typescriptlang.org/download)
4. [ts-jest](https://jestjs.io/docs/getting-started#via-ts-jest)
5. [Visual Studio Code](https://code.visualstudio.com) or other preferred text editor compatible with TypeScript

**Note:** If candidate is unfamiliar with TypeScript it is suggested they review this [TypeScript Tutorial](https://www.w3schools.com/typescript/)

# Technical Interview

## Storage Rent Owed In Window

A storage unit charges rent monthly. Rent is due on the first day of a tenant's lease and then on a specified day of the month each month thereafter. Note: If the day specified is greater than the number of days in the month, rent is due on the last day of the month.

**Proration:**

If a lease does not begin on the agreed upon monthly due date, then the first month's rent will be prorated for the remaining days until the next due date (based on a 30 day month). i.e. if there are 31 or 28 days, for the purpose of calulating the pro-rated rent you would assume there are 30 days in the month for your denominator.

e.g. 
if rent is due on the 31st and the lease begins on the 5th of Feburary 2023, then the first rent payment will be made on the 5th for \<monthly_rent\> * (28 - 5)/30, and the next payment will be made on the 31st for \<monthly_rent\>. 

if rent is due on the 15th of January and the lease begins on the 1st, then the first rent payment will be made on the 1st for \<monthly_rent\> * (15 - 1)/30, and the next payment will be made on the 15th for \<monthly_rent\>. 

if rent is due on the 15th of January and the lease begins on the 20th, then the first rent payment will be made on the 20th for \<monthly_rent\> * (1 - (20 - 15)/30).

**Rent changes:**

On a set monthly frequency (e.g. every X months) from the beginning of a window, the rent on a unit may change by a set rate. For example, if the window start date is 3/15 and we're changing rent every 2 months, the first change would occur on 5/1, then 7/1 and so on.

The rent can either be increased or decreased by a set rate. e.g. .1 = 10% increase, -.1 = -10% decrease

If the rent price changes between the previous due date and the next due date, then the new rent price will go into effect on the next due date.

Rent can only increase when the unit is rented and can only decrease while it is vacant.

### Task: ###

Complete the code in `src/StorageRent/StorageRent.ts` to return a list of rent payments due within a given time window. DO NOT change completed helper functions.

Your solution should include unit tests that validate each possible case. We have provided the first couple of tests for you in `test/StorageRent/StorageRent.test.ts`. You should write additional tests to cover remaining cases.

**Inputs:**
- `baseMonthlyRent`: The base or starting monthly rent for unit (Number)
- `leaseStartDate`: The date that the tenant's lease starts (Date)
- `windowStartDate`: The first date of the given time window (Date)
- `windowEndDate`: The last date of the given time window (Date)
- `dayOfMonthRentDue`: The day of each month on which rent is due (Number)
- `rentIncreaseFrequency`: The frequency in months the rent is changed (Number)
- `rentChangeRate`: The rate to increase or decrease rent, input as decimal (not %), positive for increase, negative for decrease (Number), 

**Return:**

Return a list of the following object:
{
    `vacancy`: boolean, // is the unit vacant? 
    `rentAmount`: number, // should be rounded to two points of precision
    `rentDueDate`: Date
}

**Solution:** see `src/StorageRent/StorageRent.ts`
