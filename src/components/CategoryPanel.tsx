"use client";

export default function CategoryPanel({

  showCategories,
  setShowCategories,

  newCategory,
  setNewCategory,

  selectedType,
  setSelectedType,

  editingCategoryId,

  addCategory,
  editCategory,
  deleteCategory,

  categories,

}: any) {

  return (

    <>


      {/* CATEGORY PANEL */}

      {showCategories && (

        <div
          className="
            bg-zinc-900
            rounded-3xl
            p-5
            mb-5
            space-y-3
          "
        >

          {/* INPUT */}

          <input
            value={newCategory}
            onChange={(e) =>
              setNewCategory(
                e.target.value
              )
            }
            placeholder="Category Name"
            className="
              w-full
              bg-black
              rounded-2xl
              p-4
            "
          />

          {/* TYPE */}

          <select
            value={selectedType}
            onChange={(e) =>
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

          {/* BUTTON */}

          <button
            onClick={addCategory}
            className="
              w-full
              bg-white
              text-black
              rounded-2xl
              p-4
              font-bold
            "
          >

            {editingCategoryId
              ? "Update Category"
              : "Add Category"}

          </button>

          {/* CATEGORY LIST */}

          <div
            className="
              space-y-3
              pt-3
            "
          >

            {categories.map(
              (cat:any) => (

                <div
                  key={cat.id}
                  className="
                    bg-black
                    rounded-2xl
                    p-4
                    flex
                    justify-between
                    items-center
                  "
                >

                  <div>

                    <p
                      className="
                        font-bold
                      "
                    >
                      {cat.name}
                    </p>

                    <p
                      className="
                        text-sm
                        text-zinc-400
                      "
                    >
                      {
                        cat.types?.name
                      }
                    </p>

                  </div>

                  <div
                    className="
                      flex
                      gap-2
                    "
                  >

                    <button
                      onClick={() =>
                        editCategory(cat)
                      }
                      className="
                        bg-zinc-800
                        px-4
                        py-2
                        rounded-xl
                      "
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        deleteCategory(
                          cat.id
                        )
                      }
                      className="
                        bg-red-500
                        px-4
                        py-2
                        rounded-xl
                      "
                    >
                      Delete
                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      )}

    </>

  );
}