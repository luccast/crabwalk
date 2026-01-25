import { useLiveQuery } from '@tanstack/react-db'
import { todosCollection } from '~/lib/demo-db'

export const dbDevtoolsPlugin = {
  name: 'TanStack DB',
  render: (
    <div className="p-4 text-sm">
      <h3 className="font-semibold mb-2">Collections</h3>
      <DbInspector />
    </div>
  ),
}

function DbInspector() {
  const todos = useLiveQuery(todosCollection)
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">todos ({todos.length})</div>
      <pre className="bg-gray-800 p-2 rounded text-xs overflow-auto max-h-48">
        {JSON.stringify(todos, null, 2)}
      </pre>
    </div>
  )
}
