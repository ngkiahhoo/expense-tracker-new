export interface Type {

  id:number;

  name:string;
}

export interface Category {

  id:number;

  name:string;

  type_id:number;

  types?:Type;
}