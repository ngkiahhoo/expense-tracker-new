import type { Currency } from "./currency";

export interface Income {

  id:number;

  amount:number;

  currency?:Currency;

  note:string;

  income_date:string;
}
