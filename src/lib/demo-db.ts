import { createCollection } from '@tanstack/db'

export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

export const todosCollection = createCollection<Todo>({
  id: 'todos',
  primaryKey: 'id',
})
