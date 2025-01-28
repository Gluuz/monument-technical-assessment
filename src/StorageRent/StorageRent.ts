export type MonthlyRentRecord = {
    vacancy: boolean;
    rentAmount: number;
    rentDueDate: Date;
  };
  
  export type MonthlyRentRecords = Array<MonthlyRentRecord>;
  
  /**
   * Calculates the list of monthly rent payments (including partial) owed in a given window,
   * taking into account:
   *   - the tenant's first (prorated) payment
   *   - monthly rent due dates
   *   - rent change frequency & rate
   *   - vacancy vs. occupancy
   *
   * @param baseMonthlyRent           The base or starting monthly rent for unit (Number)
   * @param leaseStartDate            The date that the tenant's lease starts (Date)
   * @param windowStartDate           The first date of the given time window (Date)
   * @param windowEndDate             The last date of the given time window (Date)
   * @param dayOfMonthRentDue         The day of each month on which rent is due (1..31).
   *                                  If that day doesn't exist (e.g., 31 in Feb),
   *                                  rent is due on the last day of that month.
   * @param rentRateChangeFrequency   The frequency in months the rent is changed (Number)
   * @param rentChangeRate            The rate to increase/decrease rent (decimal, e.g. 0.1=+10%, -0.1=-10%)
   * @returns MonthlyRentRecords      Array of rent-due records within the window
   */
  export function calculateMonthlyRent(
    baseMonthlyRent: number,
    leaseStartDate: Date,
    windowStartDate: Date,
    windowEndDate: Date,
    dayOfMonthRentDue: number,
    rentRateChangeFrequency: number,
    rentChangeRate: number
  ): MonthlyRentRecords {
    const results: MonthlyRentRecords = [];
  
    // If the window is invalid or zero-length, no results
    if (windowStartDate > windowEndDate) {
      return results;
    }
  
    // -------------------------------
    // 1) Generate all "rent change dates" from the window start, spaced by frequency
    //    e.g. if windowStart=3/15, freq=2, we get change dates at 5/1, 7/1, 9/1...
    // -------------------------------
    const rentChangeDates: Date[] = generateRentChangeDates(
      windowStartDate,
      windowEndDate,
      rentRateChangeFrequency
    );
  
    // Current monthly rent evolves over time as we pass these change dates
    let currentMonthlyRent = baseMonthlyRent;
  
    // -------------------------------
    // 2) If lease starts after the window ends, no rent owed
    // -------------------------------
    if (leaseStartDate > windowEndDate) {
      return results;
    }
  
    // The occupant's first payment is always on leaseStartDate
    const firstPaymentDate = new Date(leaseStartDate);
    const startDay = leaseStartDate.getDate(); 
    const dueDay = dayOfMonthRentDue;
  
    // -------------------------------
    // 3) Apply rent changes up to the occupant's first payment
    //    (If changes happened before move-in, the unit is vacant => negative changes apply.)
    // -------------------------------
    currentMonthlyRent = applyAllApplicableRentChanges(
      currentMonthlyRent,
      rentChangeRate,
      rentChangeDates,
      null,
      firstPaymentDate,
      leaseStartDate
    );
  
    // Now that we've updated `currentMonthlyRent` with any negative (or relevant) changes,
    // we use THAT for the occupant's first payment (partial or full).
    let occupantMonthlyRentAtFirstPayment = currentMonthlyRent;
  
    // -------------------------------
    // 4) Compute occupant’s first payment amount
    // -------------------------------
    let firstPaymentAmount = 0;
    let secondPaymentDate: Date;
  
    if (startDay < dueDay) {
      // partial from [startDay..(dueDay-1)] => fraction = (dueDay - startDay)/30
      const fraction = (dueDay - startDay) / 30;
      firstPaymentAmount = occupantMonthlyRentAtFirstPayment * fraction;
  
      // second payment date: same month (clamp if needed)
      secondPaymentDate = new Date(
        leaseStartDate.getFullYear(),
        leaseStartDate.getMonth(),
        dueDay
      );
      secondPaymentDate = clampToLastDayOfMonth(secondPaymentDate);
  
    } else if (startDay === dueDay) {
      // if the occupant starts exactly on the due day => full monthly rent
      firstPaymentAmount = occupantMonthlyRentAtFirstPayment;
  
      secondPaymentDate = nextMonthSameDueDay(leaseStartDate, dueDay);
    } else {
      // startDay > dueDay => partial from [startDay.. next month's dueDay]
      // fraction ~ 1 - ((startDay - dueDay)/30)
      const fraction = 1 - ( (startDay - dueDay) / 30 );
      firstPaymentAmount = occupantMonthlyRentAtFirstPayment * fraction;
  
      secondPaymentDate = nextMonthSameDueDay(leaseStartDate, dueDay);
    }
  
    // If the first payment date is within our window, record it
    if (firstPaymentDate >= windowStartDate && firstPaymentDate <= windowEndDate) {
      results.push({
        vacancy: false,
        rentAmount: roundToTwo(firstPaymentAmount),
        rentDueDate: firstPaymentDate
      });
    }
  
    // -------------------------------
    // 5) Generate subsequent due dates => occupant is renting from here on out
    // -------------------------------
    let previousDueDate = new Date(firstPaymentDate);
    let currentDueDate = secondPaymentDate;
  
    let iterationSafety = 0;
    while (iterationSafety < 500) {
      if (currentDueDate > windowEndDate) {
        break; // outside the window
      }
  
      // Apply rent changes between the previous and current due date
      currentMonthlyRent = applyAllApplicableRentChanges(
        currentMonthlyRent,
        rentChangeRate,
        rentChangeDates,
        previousDueDate,
        currentDueDate,
        leaseStartDate
      );
  
      // occupant pays if within window
      if (currentDueDate >= windowStartDate && currentDueDate <= windowEndDate) {
        results.push({
          vacancy: false,
          rentAmount: roundToTwo(currentMonthlyRent),
          rentDueDate: currentDueDate
        });
      }
  
      previousDueDate = new Date(currentDueDate);
      currentDueDate = nextMonthSameDueDay(currentDueDate, dueDay);
      iterationSafety++;
    }
  
    return results;
  }
  
  /**
   * Generates "rent change dates" from `windowStartDate` up to `windowEndDate`,
   * spaced by `frequencyMonths`.
   *
   * E.g. if windowStart=3/15, freq=2 => first change=5/1, next=7/1, etc.
   */
  function generateRentChangeDates(
    windowStartDate: Date,
    windowEndDate: Date,
    frequencyMonths: number
  ): Date[] {
    if (frequencyMonths <= 0) {
      return [];
    }
  
    const dates: Date[] = [];
    let year = windowStartDate.getFullYear();
    let month = windowStartDate.getMonth();
  
    // The first change date => the 1st of the month "frequencyMonths" after windowStart
    month += frequencyMonths;
    while (month > 11) {
      month -= 12;
      year++;
    }
    let changeDate = new Date(year, month, 1);
  
    while (changeDate <= windowEndDate) {
      dates.push(changeDate);
  
      // jump by frequencyMonths
      month += frequencyMonths;
      while (month > 11) {
        month -= 12;
        year++;
      }
      changeDate = new Date(year, month, 1);
    }
  
    return dates;
  }
  
  /**
   * Applies rent changes if a "rent change date" (cd) is strictly between
   * `previousDueDate` (exclusive) and `upcomingDueDate` (inclusive).
   *
   * If cd < leaseStartDate => vacant => negative changes can apply.
   * If cd >= leaseStartDate => occupied => positive changes can apply.
   */
  function applyAllApplicableRentChanges(
    currentRent: number,
    rentChangeRate: number,
    rentChangeDates: Date[],
    previousDueDate: Date | null,
    upcomingDueDate: Date,
    leaseStartDate: Date
  ): number {
    const prevTime = previousDueDate ? previousDueDate.getTime() : -Infinity;
    const nextTime = upcomingDueDate.getTime();
  
    for (const cd of rentChangeDates) {
      const cdt = cd.getTime();
      if (cdt > prevTime && cdt <= nextTime) {
        // Is occupant renting at cd?
        const occupantIsRenting = cd >= leaseStartDate;
  
        // If occupant is renting => apply positive rate
        if (occupantIsRenting && rentChangeRate > 0) {
          currentRent = calculateNewMonthlyRent(currentRent, rentChangeRate);
        }
        // If occupant is vacant => apply negative rate
        else if (!occupantIsRenting && rentChangeRate < 0) {
          currentRent = calculateNewMonthlyRent(currentRent, rentChangeRate);
        }
      }
    }
  
    return currentRent;
  }
  
  /** Returns baseRent * (1 + rentChangeRate). */
  function calculateNewMonthlyRent(baseRent: number, rentChangeRate: number) {
    return baseRent * (1 + rentChangeRate);
  }
  
  /** Rounds a number to two decimals. */
  function roundToTwo(n: number): number {
    return Math.round(n * 100) / 100;
  }
  
  /**
   * Clamps a Date's day-of-month to the last day of that same month if necessary.
   * e.g., if we have 2023-Feb-31, JS auto-rolls to Mar-03.
   * This function ensures we get Feb-28 (or Feb-29 in leap year).
   */
  function clampToLastDayOfMonth(d: Date): Date {
    const year = d.getFullYear();
    const month = d.getMonth();
    const desiredDay = d.getDate();
  
    const lastDay = new Date(year, month + 1, 0).getDate();
    if (desiredDay > lastDay) {
      return new Date(year, month, lastDay);
    }
    return d;
  }
  
  /**
   * Returns a new Date that is the 'dayOfMonth' in the *next* month after `currentDate`,
   * clamping if necessary to the last day of that next month.
   */
  function nextMonthSameDueDay(currentDate: Date, dayOfMonth: number): Date {
    let year = currentDate.getFullYear();
    let month = currentDate.getMonth() + 1; // move to next month
    if (month > 11) {
      month = 0;
      year++;
    }
  
    const lastDay = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(dayOfMonth, lastDay);
  
    return new Date(year, month, clampedDay);
  }
  
  function isLeapYear(year: number) {
    return (year % 4 == 0 && year % 100 != 0);
}
  