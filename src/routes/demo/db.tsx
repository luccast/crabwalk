import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useLiveQuery, createTransaction } from '@tanstack/react-db'
import { todosCollection, type Todo } from '~/lib/demo-db'

export const Route = createFileRoute('/demo/db')({
  component: DbDemo,
})

function DbDemo() {
  const [newTodo, setNewTodo] = useState('')
  const todos = useLiveQuery(todosCollection)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    const tx = createTransaction({
      mutationFn: async () => {
        // Local-only collection auto-persists
      },
    })

    tx.mutate(() => {
      todosCollection.insert({
        id: crypto.randomUUID(),
        text: newTodo.trim(),
        completed: false,
        createdAt: Date.now(),
      })
    })

    await tx.commit()
    setNewTodo('')
  }

  const handleToggle = async (todo: Todo) => {
    const tx = createTransaction({
      mutationFn: async () => {},
    })

    tx.mutate(() => {
      todosCollection.update(todo.id, { completed: !todo.completed })
    })

    await tx.commit()
  }

  const handleDelete = async (id: string) => {
    const tx = createTransaction({
      mutationFn: async () => {},
    })

    tx.mutate(() => {
      todosCollection.delete(id)
    })

    await tx.commit()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">TanStack DB Demo</h1>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Add a new todo..."
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition-colors"
            >
              Add
            </button>
          </div>
        </form>

        <div className="space-y-2">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggle(todo)}
                className="w-5 h-5 rounded accent-orange-500"
              />
              <span
                className={`flex-1 ${todo.completed ? 'line-through text-gray-500' : ''}`}
              >
                {todo.text}
              </span>
              <button
                onClick={() => handleDelete(todo.id)}
                className="px-2 py-1 text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </div>
          ))}
          {todos.length === 0 && (
            <p className="text-gray-500 text-center py-4">No todos yet. Add one above.</p>
          )}
        </div>

        <div className="mt-8 bg-gray-800 rounded-lg p-4">
          <h2 className="font-semibold mb-2">Database State</h2>
          <pre className="text-sm text-gray-400 overflow-auto max-h-48">
            {JSON.stringify(todos, null, 2)}
          </pre>
        </div>

        <div className="mt-8">
          <Link to="/" className="text-cyan-400 hover:text-cyan-300">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
