import { calculateMonthlyRent } from "../../src/StorageRent/StorageRent"; // <-- Adjust if needed

/**
 * A small "factory" function that returns default params for calculateMonthlyRent.
 */
function makeRentParams(overrides: Partial<{
  baseMonthlyRent: number;
  leaseStartDate: Date;
  windowStartDate: Date;
  windowEndDate: Date;
  dayOfMonthRentDue: number;
  rentRateChangeFrequency: number;
  rentChangeRate: number;
}> = {}) {
  const defaults = {
    baseMonthlyRent: 100.0,
    leaseStartDate: new Date("2023-01-01T00:00:00"),
    windowStartDate: new Date("2023-01-01T00:00:00"),
    windowEndDate: new Date("2023-03-31T00:00:00"),
    dayOfMonthRentDue: 1,
    rentRateChangeFrequency: 1,
    rentChangeRate: 0.1,
  };

  return { ...defaults, ...overrides };
}

describe("calculateMonthlyRent function", () => {

  it("should return MonthlyRentRecords (simple base case)", () => {
    // Simple example: occupant starts on dayOfMonthRentDue=1, so no proration
    // Rent changes by +10% each month (rentRateChangeFrequency=1, rentChangeRate=0.1).
    // The occupant is present for Jan, Feb, Mar => 3 payments
    const params = makeRentParams({
      baseMonthlyRent: 100.0, // override default
      // The rest of the defaults match what we need
    });

    const result = calculateMonthlyRent(
      params.baseMonthlyRent,
      params.leaseStartDate,
      params.windowStartDate,
      params.windowEndDate,
      params.dayOfMonthRentDue,
      params.rentRateChangeFrequency,
      params.rentChangeRate
    );

    const expectedResult = [
      {
        vacancy: false,
        rentAmount: 100.0,
        rentDueDate: new Date("2023-01-01T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 110.0,
        rentDueDate: new Date("2023-02-01T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 121.0,
        rentDueDate: new Date("2023-03-01T00:00:00"),
      },
    ];

    expect(result).toEqual(expectedResult);
  });

  it("should validate first payment date & proration when lease start is before monthly due date", () => {
    // The occupant starts earlier in the month than dueDate=15
    // So the occupant’s first payment is partial from start date -> 15th
    // Then subsequent monthly payments on the 15th
    const params = makeRentParams({
      baseMonthlyRent: 100.0,
      leaseStartDate: new Date("2023-01-01T00:00:00"),
      windowStartDate: new Date("2023-01-01T00:00:00"),
      windowEndDate: new Date("2023-03-31T00:00:00"),
      dayOfMonthRentDue: 15,
      rentRateChangeFrequency: 1,
      rentChangeRate: 0.1,
    });

    const result = calculateMonthlyRent(
      params.baseMonthlyRent,
      params.leaseStartDate,
      params.windowStartDate,
      params.windowEndDate,
      params.dayOfMonthRentDue,
      params.rentRateChangeFrequency,
      params.rentChangeRate
    );

    const expectedResult = [
      {
        vacancy: false,
        rentAmount: 46.67, // (15 - 1)/30 * 100 => 14/30*100 => 46.666.. => 46.67
        rentDueDate: new Date("2023-01-01T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 100.0,
        rentDueDate: new Date("2023-01-15T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 110.0,
        rentDueDate: new Date("2023-02-15T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 121.0,
        rentDueDate: new Date("2023-03-15T00:00:00"),
      },
    ];

    expect(result).toEqual(expectedResult);
  });

  it("should handle leaseStartDate exactly equal to due date (full rent immediately)", () => {
    // If occupant starts exactly on dayOfMonthRentDue, the entire monthly rent is due.
    // Next months are incremented by +10%
    const params = makeRentParams({
      baseMonthlyRent: 200.0,
      leaseStartDate: new Date("2023-02-15T00:00:00"),
      windowStartDate: new Date("2023-02-01T00:00:00"),
      windowEndDate: new Date("2023-04-30T00:00:00"),
      dayOfMonthRentDue: 15, // matches the lease start day
      rentRateChangeFrequency: 1,
      rentChangeRate: 0.1, // 10% monthly
    });

    const result = calculateMonthlyRent(
      params.baseMonthlyRent,
      params.leaseStartDate,
      params.windowStartDate,
      params.windowEndDate,
      params.dayOfMonthRentDue,
      params.rentRateChangeFrequency,
      params.rentChangeRate
    );

    // Payment pattern:
    //  - 2/15: full 200.00
    //  - 3/15: rent changes once between 2/15 and 3/15 => +10% => 220.00
    //  - 4/15: +10% of 220 => 242.00
    //  - Next 5/15 is beyond window
    const expectedResult = [
      {
        vacancy: false,
        rentAmount: 200.0,
        rentDueDate: new Date("2023-02-15T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 220.0,
        rentDueDate: new Date("2023-03-15T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 242.0,
        rentDueDate: new Date("2023-04-15T00:00:00"),
      },
    ];

    expect(result).toEqual(expectedResult);
  });

  it("should handle leaseStartDate AFTER the usual due date (proration example #2)", () => {
    // e.g. monthly due = 10th, occupant starts on the 20th
    // First partial from 20th to next month's 10th => formula from README
    const params = makeRentParams({
      baseMonthlyRent: 100.0,
      leaseStartDate: new Date("2023-01-20T00:00:00"),
      windowStartDate: new Date("2023-01-01T00:00:00"),
      windowEndDate: new Date("2023-03-31T00:00:00"),
      dayOfMonthRentDue: 10,
      rentRateChangeFrequency: 0, // no changes
      rentChangeRate: 0,
    });

    const result = calculateMonthlyRent(
      params.baseMonthlyRent,
      params.leaseStartDate,
      params.windowStartDate,
      params.windowEndDate,
      params.dayOfMonthRentDue,
      params.rentRateChangeFrequency,
      params.rentChangeRate
    );

    // Explanation:
    //  - First payment due on 1/20 for partial: monthlyRent * (1 - ((20 - 10)/30))
    //    => 100 * (1 - (10/30)) => 66.67
    //  - Next payment: 2/10 => full = 100
    //  - Next after that: 3/10 => full = 100
    //  - 4/10 => outside window
    const expected = [
      {
        vacancy: false,
        rentAmount: 66.67,
        rentDueDate: new Date("2023-01-20T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 100.0,
        rentDueDate: new Date("2023-02-10T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 100.0,
        rentDueDate: new Date("2023-03-10T00:00:00"),
      },
    ];
    expect(result).toHaveLength(3);
    expect(result).toEqual(expected);
  });

  it("should handle windowStartDate AFTER windowEndDate => no payments in the window", () => {
    // windowStartDate is after windowEndDate => no payments in the window
    const params = makeRentParams({
      baseMonthlyRent: 500.0,
      leaseStartDate: new Date("2023-07-01T00:00:00"),
      windowStartDate: new Date("2023-01-01T00:00:00"),
      windowEndDate: new Date("2022-06-30T00:00:00"),
      dayOfMonthRentDue: 15,
      rentRateChangeFrequency: 1,
      rentChangeRate: 0.1,
    });

    const result = calculateMonthlyRent(
      params.baseMonthlyRent,
      params.leaseStartDate,
      params.windowStartDate,
      params.windowEndDate,
      params.dayOfMonthRentDue,
      params.rentRateChangeFrequency,
      params.rentChangeRate
    );

    expect(result).toEqual([]);
  });

  it("should handle lease start AFTER windowEndDate => no payments in the window", () => {
    // occupant doesn't start until after the window is over => zero due
    const params = makeRentParams({
      baseMonthlyRent: 500.0,
      leaseStartDate: new Date("2023-07-01T00:00:00"), // starts in July
      windowEndDate: new Date("2023-06-30T00:00:00"),  // window ends June 30
      dayOfMonthRentDue: 15,
      rentRateChangeFrequency: 1,
      rentChangeRate: 0.1,
    });

    const result = calculateMonthlyRent(
      params.baseMonthlyRent,
      params.leaseStartDate,
      params.windowStartDate,
      params.windowEndDate,
      params.dayOfMonthRentDue,
      params.rentRateChangeFrequency,
      params.rentChangeRate
    );

    // There's no occupancy within the window, so presumably no rent due records.
    // Usually we'd expect an empty array of *payments*.
    expect(result).toEqual([]);
  });

  it("handles dayOfMonthRentDue = 31 in a short month (Feb)", () => {
    // dayOfMonthRentDue = 31 => should clamp to the last day in months with < 31 days.
    const params = makeRentParams({
      baseMonthlyRent: 100.0,
      leaseStartDate: new Date("2023-01-31T00:00:00"),
      windowEndDate: new Date("2023-04-30T00:00:00"),
      dayOfMonthRentDue: 31,
      rentRateChangeFrequency: 0,
      rentChangeRate: 0,
    });

    const result = calculateMonthlyRent(
      params.baseMonthlyRent,
      params.leaseStartDate,
      params.windowStartDate,
      params.windowEndDate,
      params.dayOfMonthRentDue,
      params.rentRateChangeFrequency,
      params.rentChangeRate
    );

    // The occupant starts on 1/31 => that is the due date, so full rent for Jan 31
    // Next month => 2/31 does NOT exist => clamp to 2/28 (non-leap year 2023)
    // Next => 3/31 => valid
    // Next => 4/31 => clamp to 4/30 => which is within window
    // Next => 5/31 => outside window
    const expected = [
      {
        vacancy: false,
        rentAmount: 100.0,
        rentDueDate: new Date("2023-01-31T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 100.0,
        rentDueDate: new Date("2023-02-28T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 100.0,
        rentDueDate: new Date("2023-03-31T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 100.0,
        rentDueDate: new Date("2023-04-30T00:00:00"),
      },
    ];

    expect(result).toEqual(expected);
  });

  it("handles dayOfMonthRentDue = 31 in a leap year (Feb 2024)", () => {
    // dayOfMonthRentDue = 31 => in a leap year, February has 29 days (2024).
    // Should clamp to Feb 29 instead of Feb 28
    const params = makeRentParams({
      baseMonthlyRent: 100.0,
      // Occupant starts on January 31, 2024
      leaseStartDate: new Date("2024-01-31T00:00:00"),
      windowStartDate: new Date("2024-01-01T00:00:00"),
      // We'll stop at May 30, 2024, so that a due date of May 31 is just outside
      windowEndDate: new Date("2024-05-30T00:00:00"),
      dayOfMonthRentDue: 31,
      rentRateChangeFrequency: 0,
      rentChangeRate: 0,
    });

    const result = calculateMonthlyRent(
      params.baseMonthlyRent,
      params.leaseStartDate,
      params.windowStartDate,
      params.windowEndDate,
      params.dayOfMonthRentDue,
      params.rentRateChangeFrequency,
      params.rentChangeRate
    );

    // Explanation:
    //  1) First payment: 1/31/2024 (full rent)
    //  2) Next month: "2/31" doesn't exist, so clamp to 2/29/2024 (leap year!)
    //  3) Next: 3/31 (valid)
    //  4) Next: 4/31 doesn't exist, so clamp to 4/30
    //  5) Next: 5/31 is outside our windowEndDate=5/30 => stop
    const expected = [
      {
        vacancy: false,
        rentAmount: 100.0,
        rentDueDate: new Date("2024-01-31T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 100.0,
        rentDueDate: new Date("2024-02-29T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 100.0,
        rentDueDate: new Date("2024-03-31T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 100.0,
        rentDueDate: new Date("2024-04-30T00:00:00"),
      },
    ];

    expect(result).toEqual(expected);
  });

  it("handles negative rentChangeRate while vacant (rent decrease scenario)", () => {
    // If the rent changes (negatively) before leaseStart => new base monthly rent is lower
    // by the time occupant starts paying. Then once occupant starts, negative changes no longer apply.
    // For demonstration:
    //   - windowStart=4/1, occupant leaseStart=6/15
    //   - rent changes at 5/1 => the unit is still vacant => -10% => new rent=270
    //   - next rent change at 6/1 => still vacant => another -10% => 243
    //   - occupant pays first on 6/15 => full 243.0
    //   - subsequent due dates (7/15, 8/15) remain at 243.0 (no further negative changes)
    const params = makeRentParams({
      baseMonthlyRent: 300.0,
      leaseStartDate: new Date("2023-06-15T00:00:00"),
      windowStartDate: new Date("2023-04-01T00:00:00"),
      windowEndDate: new Date("2023-08-31T00:00:00"),
      dayOfMonthRentDue: 15,
      rentRateChangeFrequency: 1, // changes happen monthly
      rentChangeRate: -0.1,       // -10% monthly, only applies if vacant
    });

    const result = calculateMonthlyRent(
      params.baseMonthlyRent,
      params.leaseStartDate,
      params.windowStartDate,
      params.windowEndDate,
      params.dayOfMonthRentDue,
      params.rentRateChangeFrequency,
      params.rentChangeRate
    );

    const expected = [
      {
        vacancy: false,
        rentAmount: 243.0, // after 2 negative changes (5/1 and 6/1)
        rentDueDate: new Date("2023-06-15T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 243.0,
        rentDueDate: new Date("2023-07-15T00:00:00"),
      },
      {
        vacancy: false,
        rentAmount: 243.0,
        rentDueDate: new Date("2023-08-15T00:00:00"),
      },
    ];

    expect(result).toEqual(expected);
  });
});
