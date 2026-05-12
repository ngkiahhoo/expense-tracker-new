import {
  Pencil,
  Trash2,
} from "lucide-react";

export default function ExpenseCard({
  expense,
  startEdit,
  deleteExpense,
}: any) {
  return (
    <div
      className="
        bg-zinc-900
        rounded-2xl
        p-4
      "
    >

      <div
        className="
          flex
          justify-between
          items-start
        "
      >

        <div>
          <p className="font-bold">
            {expense.note}
          </p>

          <p className="
  text-zinc-400
">
  {expense.categories?.name}

  {" • "}

  {
    expense.categories?.types?.name
  }
</p>

          <p
            className="
              text-xs
              text-zinc-500
              mt-1
            "
          >
            {
              expense.expense_date
            }
          </p>
        </div>

        <div className="text-right">

          <p
            className="
              text-xl
              font-bold
            "
          >
            RM {expense.amount}
          </p>

          <div
            className="
              flex
              gap-2
              mt-3
              justify-end
            "
          >

            <button
              onClick={() =>
                startEdit(expense)
              }
              className="
                bg-zinc-800
                p-2
                rounded-xl
              "
            >
              <Pencil size={16}/>
            </button>

            <button
              onClick={() =>
                deleteExpense(
                  expense.id
                )
              }
              className="
                bg-red-500
                p-2
                rounded-xl
              "
            >
              <Trash2 size={16}/>
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}