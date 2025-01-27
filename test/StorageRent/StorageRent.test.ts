import { calculateMonthlyRent, MonthlyRentRecord, MonthlyRentRecords } from "../../src/StorageRent/StorageRent";

describe("calculateMonthlyRent function", () => {
  
    it("should return MonthlyRentRecords", () => {

        const baseMonthlyRent = 100.00;
        const leaseStartDate = new Date("2023-01-01T00:00:00");
        const windowStartDate = new Date("2023-01-01T00:00:00");
        const windowEndDate = new Date("2023-03-31T00:00:00");
        const dayOfMonthRentDue = 1;
        const rentRateChangeFrequency = 1;
        const rentChangeRate = .1;

        const result = calculateMonthlyRent(baseMonthlyRent,
            leaseStartDate, windowStartDate, windowEndDate, 
            dayOfMonthRentDue, rentRateChangeFrequency, rentChangeRate);

        let expectedResult = [
            {
                vacancy: false,
                rentAmount: 100.00,
                rentDueDate: new Date("2023-01-01T00:00:00")
            },
            {
                vacancy: false,
                rentAmount: 110.00, 
                rentDueDate: new Date("2023-02-01T00:00:00")
            },
            {
                vacancy: false,
                rentAmount: 121.00,
                rentDueDate: new Date("2023-03-01T00:00:00")
            }
        ];

        expect(result).toEqual(expectedResult);
    });

    it("should return MonthlyRentRecords validate first payment due date and first month pro-rate when lease start is before monthly due date", () => {

        const baseMonthlyRent = 100.00;
        const leaseStartDate = new Date("2023-01-01T00:00:00");
        const windowStartDate = new Date("2023-01-01T00:00:00");
        const windowEndDate = new Date("2023-03-31T00:00:00");
        const dayOfMonthRentDue = 15;
        const rentRateChangeFrequency = 1;
        const rentChangeRate = .1;
    
        const result = calculateMonthlyRent(baseMonthlyRent,
            leaseStartDate, windowStartDate, windowEndDate, 
            dayOfMonthRentDue, rentRateChangeFrequency, rentChangeRate);
    
        let expectedResult = [
            {
                vacancy: false,
                rentAmount: 46.67,
                rentDueDate: new Date("2023-01-01T00:00:00")
            },
            {
                vacancy: false,
                rentAmount: 100,
                rentDueDate: new Date("2023-01-15T00:00:00")
            },
            {
                vacancy: false,
                rentAmount: 110.00, 
                rentDueDate: new Date("2023-02-15T00:00:00")
            },
            {
                vacancy: false,
                rentAmount: 121.00,
                rentDueDate: new Date("2023-03-15T00:00:00")
            }
        ];
    
        expect(result).toEqual(expectedResult);
      });
