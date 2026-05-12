"use client";

import ExpenseCard from
"../components/ExpenseCard";

import IncomeCard from
"../components/IncomeCard";

import ExpenseForm from
"../components/ExpenseForm";

import AnalyticsPanel from
"../components/AnalyticsPanel";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabase";

import {
  Plus,
  X,
  RotateCcw,
  FolderCog,
  Wallet,
} from "lucide-react";

export default function Home() {

  const currentMonth =
    `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}`;

  const months =
    Array.from(
      { length: 12 },
      (_, i) => {

        const d = new Date();

        d.setMonth(
          d.getMonth() - i
        );

        return `${d.getFullYear()}-${String(
          d.getMonth() + 1
        ).padStart(2, "0")}`;
      }
    );

  const [showIncomeList, setShowIncomeList] =
    useState(false);

  const [expenses, setExpenses] =
    useState<any[]>([]);

  const [categories, setCategories] =
    useState<any[]>([]);

  const [incomes, setIncomes] =
    useState<any[]>([]);

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth);

  const [amount, setAmount] =
    useState("");

  const [note, setNote] =
    useState("");

  const [expenseDate, setExpenseDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [selectedCategory, setSelectedCategory] =
    useState("");

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [showCategories, setShowCategories] =
    useState(false);

  const [showAnalytics, setShowAnalytics] =
    useState(false);

  const [showExpenseForm, setShowExpenseForm] =
    useState(false);

  const [showIncomeForm, setShowIncomeForm] =
    useState(false);

  const [newCategory, setNewCategory] =
    useState("");

  const [
  editingCategoryId,
  setEditingCategoryId
] = useState<number | null>(
  null
);

  const [selectedType, setSelectedType] =
    useState("needs");

  const [incomeAmount, setIncomeAmount] =
    useState("");

  const [incomeNote, setIncomeNote] =
    useState("");

  const [incomeEditingId, setIncomeEditingId] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(false);

  async function fetchExpenses() {

    const start =
      `${selectedMonth}-01`;

    const end =
      `${selectedMonth}-31`;

    const { data, error } =
      await supabase
        .from("expenses")
        .select(`
  *,
  categories (
    id,
    name,
    type_id,
    types (
      id,
      name
    )
  )
`)
        .gte("expense_date", start)
        .lte("expense_date", end)
        .order("expense_date", {
          ascending: false,
        });

    if (error) {
      console.log(error);
      return;
    }

    setExpenses(data || []);
  }

  async function fetchCategories() {

    const { data, error } =
      await supabase
        .from("categories")
        .select(`
  id,
  name,
  type_id,
  types (
    id,
    name
  )
`)
        .order("name");

    if (error) {
      console.log(error);
      return;
    }

    setCategories(data || []);
  }

  async function fetchIncome() {

    const start =
      `${selectedMonth}-01`;

    const end =
      `${selectedMonth}-31`;

    const { data } = await supabase
      .from("incomes")
      .select("*")
      .gte("income_date", start)
      .lte("income_date", end);

    setIncomes(data || []);
  }

  useEffect(() => {

    fetchExpenses();
    fetchCategories();
    fetchIncome();

  }, [selectedMonth]);

  async function saveExpense() {

    if (
      !amount ||
      !note ||
      !selectedCategory
    ) return;

    setLoading(true);

    if (editingId) {

      const { error } =
        await supabase
          .from("expenses")
          .update({
            amount: Number(amount),
            note,
            expense_date:
              expenseDate,
            category_id:
              Number(
                selectedCategory
              ),
          })
          .eq("id", editingId);

      if (error) {
        console.log(error);
      }

      setEditingId(null);

    } else {

      const { error } =
        await supabase
          .from("expenses")
          .insert([
            {
              amount:
                Number(amount),

              note,

              expense_date:
                expenseDate,

              category_id:
                Number(
                  selectedCategory
                ),
            },
          ]);

      if (error) {
        console.log(error);
      }
    }

    resetForm();

    fetchExpenses();

    setLoading(false);
  }

  function resetForm() {

    setAmount("");

    setNote("");

    setSelectedCategory("");

    setExpenseDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );
  }

  async function deleteExpense(id:number) {

    await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    fetchExpenses();
  }

  function startEdit(expense:any) {

    setShowExpenseForm(true);

    setEditingId(expense.id);

    setAmount(
      expense.amount.toString()
    );

    setNote(expense.note);

    setExpenseDate(
      expense.expense_date
    );

    if (expense.category_id) {

      setSelectedCategory(
        expense.category_id.toString()
      );
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function addCategory() {

  if (!newCategory) return;

  const selectedTypeData =
    await supabase
      .from("types")
      .select("id")
      .eq(
  "name",
  selectedType.charAt(0)
    .toUpperCase() +
    selectedType.slice(1)
)
      .single();

  const typeId =
    selectedTypeData.data?.id;

  if (!typeId) return;

  if (editingCategoryId) {

    await supabase
      .from("categories")
      .update({
        name: newCategory,
        type_id: typeId,
      })
      .eq(
        "id",
        editingCategoryId
      );

  } else {

    await supabase
      .from("categories")
      .insert([
        {
          name: newCategory,
          type_id: typeId,
        },
      ]);
  }

  setNewCategory("");

  setEditingCategoryId(null);

  fetchCategories();
}

  async function deleteCategory(
  id:number
) {

  const { error } =
    await supabase
      .from("categories")
      .delete()
      .eq("id", id);

  if (error) {

    alert(
      "This category is being used by expenses."
    );

    return;
  }

  fetchCategories();
}

  function editCategory(cat:any) {

  setEditingCategoryId(
    cat.id
  );

  setNewCategory(
    cat.name
  );

  setSelectedType(
    cat.types?.name?.toLowerCase()
  );

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth",
  });
}

  async function addIncome() {

    if (!incomeAmount) return;

    if (incomeEditingId) {

      await supabase
        .from("incomes")
        .update({
          amount:
            Number(incomeAmount),

          note: incomeNote,
        })
        .eq(
          "id",
          incomeEditingId
        );

      setIncomeEditingId(null);

    } else {

      await supabase
        .from("incomes")
        .insert([
          {
            amount:
              Number(incomeAmount),

            note: incomeNote,

            income_date:
              `${selectedMonth}-01`,
          },
        ]);
    }

    setIncomeAmount("");

    setIncomeNote("");

    fetchIncome();
  }

  async function deleteIncome(
    id:number
  ) {

    await supabase
      .from("incomes")
      .delete()
      .eq("id", id);

    fetchIncome();
  }

  function startEditIncome(
    income:any
  ) {

    setIncomeEditingId(
      income.id
    );

    setIncomeAmount(
      income.amount.toString()
    );

    setIncomeNote(
      income.note || ""
    );

    setShowIncomeForm(true);
  }

  const totalSpending =
    expenses.reduce(
      (sum, item) =>
        sum + Number(item.amount),
      0
    );

  const totalIncome =
    incomes.reduce(
      (sum, item) =>
        sum + Number(item.amount),
      0
    );

  const spendingPercent =
    totalIncome > 0
      ? (
          (totalSpending /
            totalIncome) *
          100
        ).toFixed(1)
      : "0";

  
    const analytics =
  useMemo(() => {

    const result:any = {
      needs: 0,
      wants: 0,
      savings: 0,
    };

    expenses.forEach((expense) => {

      const typeName =
        expense.categories?.types?.name
          ?.toLowerCase();

      if (
        typeName === "needs"
      ) {

        result.needs +=
          Number(expense.amount);

      } else if (
        typeName === "wants"
      ) {

        result.wants +=
          Number(expense.amount);

      } else if (
        typeName === "savings"
      ) {

        result.savings +=
          Number(expense.amount);
      }

    });

    return result;

  }, [expenses]);

  return (

    <main className="
      min-h-screen
      bg-black
      text-white
      p-5
    ">

      <div className="
        max-w-md
        mx-auto
      ">

        <div className="
          flex
          justify-between
          items-start
          mb-6
        ">

          <div>

            <h1 className="
              text-5xl
              font-bold
            ">
              Expense Tracker
            </h1>

            <p className="
              text-zinc-400
              mt-2
            ">
              {selectedMonth}
            </p>

          </div>

          <button
            onClick={() => {

              fetchExpenses();

              fetchCategories();

              fetchIncome();

            }}
            className="
              bg-zinc-900
              p-4
              rounded-2xl
            "
          >
            <RotateCcw size={20}/>
          </button>

        </div>

        <select
          value={selectedMonth}
          onChange={(e)=>
            setSelectedMonth(
              e.target.value
            )
          }
          className="
            w-full
            bg-zinc-900
            border
            border-zinc-800
            rounded-2xl
            p-4
            mb-5
          "
        >

          {months.map((month) => (

            <option
              key={month}
              value={month}
            >
              {month === currentMonth
                ? "Current Month"
                : month}
            </option>

          ))}

        </select>

        <div className="
          bg-zinc-900
          rounded-3xl
          p-6
          mb-4
        ">

          <div className="
            flex
            items-center
            gap-2
            mb-2
          ">

            <Wallet size={18}/>

            <p className="
              text-zinc-400
            ">
              Monthly Income
            </p>

          </div>

          <h2 className="
            text-4xl
            font-bold
            mb-4
          ">
            RM {totalIncome.toFixed(2)}
          </h2>

          <button
            onClick={() =>
              setShowIncomeList(
                !showIncomeList
              )
            }
            className="
              w-full
              bg-zinc-800
              rounded-2xl
              p-4
              text-left
              font-semibold
            "
          >

            {showIncomeList
              ? "Hide Income Records"
              : "Show Income Records"}

          </button>

          {showIncomeList && (

            <div className="
              space-y-3
              mt-4
            ">

              {incomes.map((income) => (

                <IncomeCard
                  key={income.id}
                  income={income}
                  startEditIncome={
                    startEditIncome
                  }
                  deleteIncome={
                    deleteIncome
                  }
                />

              ))}

            </div>

          )}

        </div>

        <button
          onClick={() =>
            setShowAnalytics(
              !showAnalytics
            )
          }
          className="
            w-full
            bg-zinc-900
            rounded-3xl
            p-6
            mb-5
            text-left
          "
        >

          <p className="
            text-zinc-400
            mb-2
          ">
            Total Spending
          </p>

          <h2 className="
            text-5xl
            font-bold
            mb-2
          ">
            RM {totalSpending.toFixed(2)}
          </h2>

          <p className="
            text-zinc-400
          ">
            {spendingPercent}% of income
          </p>

        </button>

        {showAnalytics && (

          <AnalyticsPanel
            analytics={analytics}
            totalSpending={
              totalSpending
            }
            totalIncome={
              totalIncome
            }
            expenses={expenses}
          />

        )}

        <div className="mb-5">

          <button
            onClick={() =>
              setShowExpenseForm(
                !showExpenseForm
              )
            }
            className="
              w-full
              bg-zinc-900
              rounded-2xl
              p-4
              font-bold
              mb-3
              flex
              items-center
              justify-center
              gap-2
            "
          >

            {showExpenseForm ? (
              <>
                <X size={18}/>
                Close Expense Form
              </>
            ) : (
              <>
                <Plus size={18}/>
                Add Expense
              </>
            )}

          </button>

          {showExpenseForm && (

            <ExpenseForm

              amount={amount}
              setAmount={setAmount}

              note={note}
              setNote={setNote}

              expenseDate={expenseDate}
              setExpenseDate={
                setExpenseDate
              }

              selectedCategory={
                selectedCategory
              }

              setSelectedCategory={
                setSelectedCategory
              }

              categories={categories}

              editingId={editingId}

              saveExpense={saveExpense}

              loading={loading}

              cancelEdit={() => {

                setEditingId(null);

                resetForm();

                setShowExpenseForm(
                  false
                );

              }}
            />

          )}

        </div>

        <div className="mb-5">

          <button
            onClick={() =>
              setShowIncomeForm(
                !showIncomeForm
              )
            }
            className="
              w-full
              bg-zinc-900
              rounded-2xl
              p-4
              font-bold
              mb-3
              flex
              items-center
              justify-center
              gap-2
            "
          >

            {showIncomeForm ? (
              <>
                <X size={18}/>
                Close Income Form
              </>
            ) : (
              <>
                <Plus size={18}/>
                Add Income
              </>
            )}

          </button>

          {showIncomeForm && (

            <div className="
              bg-zinc-900
              rounded-3xl
              p-5
              space-y-3
            ">

              <input
                type="number"
                placeholder="Income Amount"
                value={incomeAmount}
                onChange={(e)=>
                  setIncomeAmount(
                    e.target.value
                  )
                }
                className="
                  w-full
                  bg-black
                  rounded-2xl
                  p-4
                "
              />

              <input
                type="text"
                placeholder="Income Note"
                value={incomeNote}
                onChange={(e)=>
                  setIncomeNote(
                    e.target.value
                  )
                }
                className="
                  w-full
                  bg-black
                  rounded-2xl
                  p-4
                "
              />

              <button
                onClick={async () => {

                  await addIncome();

                  setShowIncomeForm(
                    false
                  );

                }}
                className="
                  w-full
                  bg-green-500
                  text-black
                  rounded-2xl
                  py-4
                  font-bold
                "
              >
                Save Income
              </button>

            </div>

          )}

        </div>

        <button
          onClick={() =>
            setShowCategories(
              !showCategories
            )
          }
          className="
            w-full
            bg-zinc-900
            rounded-2xl
            p-4
            flex
            items-center
            justify-center
            gap-2
            mb-5
          "
        >

          <FolderCog size={18}/>

          Categories

        </button>

        {showCategories && (

          <div className="
            bg-zinc-900
            rounded-3xl
            p-5
            mb-5
            space-y-3
          ">

            <input
              type="text"
              placeholder="Category Name"
              value={newCategory}
              onChange={(e)=>
                setNewCategory(
                  e.target.value
                )
              }
              className="
                w-full
                bg-black
                rounded-2xl
                p-4
              "
            />

            <select
              value={selectedType}
              onChange={(e)=>
                setSelectedType(
                  e.target.value
                )
              }
              className="
                w-full
                bg-black
                rounded-2xl
                p-4
              "
            >

              <option value="needs">
                Needs
              </option>

              <option value="wants">
                Wants
              </option>

              <option value="savings">
                Savings
              </option>

            </select>

            <button
              onClick={addCategory}
              className="
                w-full
                bg-white
                text-black
                rounded-2xl
                py-4
                font-bold
              "
            >
              {
  editingCategoryId
    ? "Update Category"
    : "Add Category"
}
            </button>

            <div className="
              space-y-2
              pt-3
            ">

              {categories.map((cat) => (

  <div
    key={cat.id}
    className="
      bg-black
      rounded-2xl
      p-4
      flex
      items-center
      justify-between
    "
  >

    <div>

      <p className="
        font-semibold
      ">
        {cat.name}
      </p>

      <p className="
        text-sm
        text-zinc-500
      ">
        {cat.types?.name}
      </p>

    </div>

    <div className="
      flex
      gap-2
    ">

      <button
        onClick={() =>
          editCategory(cat)
        }
        className="
          bg-zinc-800
          px-3
          py-2
          rounded-xl
          text-sm
        "
      >
        Edit
      </button>

      <button
        onClick={() =>
          deleteCategory(cat.id)
        }
        className="
          bg-red-500
          px-3
          py-2
          rounded-xl
          text-sm
        "
      >
        Delete
      </button>

    </div>

  </div>

))}

            </div>

          </div>

        )}

        <div className="space-y-3">

          {expenses.map((expense) => (

            <ExpenseCard
              key={expense.id}
              expense={expense}
              startEdit={startEdit}
              deleteExpense={deleteExpense}
            />

          ))}

        </div>

      </div>

    </main>
  );
}