import React from "react";

export default function DynamicTable({
  title,
  columns,
  data,
  onCreate,
  onEdit,
  onDelete,
  editButtonText = "Edit",
}) {
  return (
    <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {onCreate && (
          <button
            onClick={onCreate}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            + Add
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="p-3 text-left border-b border-gray-700 whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="p-3 border-b border-gray-700 whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row._id} className="hover:bg-gray-800">
                {columns.map((col) => (
                  <td key={col.key} className="p-3 border-b border-gray-800">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="p-3 border-b border-gray-800">
                    <div className="flex gap-3">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row._id)}
                          className="text-blue-400 hover:underline"
                        >
                          {editButtonText}
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row._id)}
                          className="text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
