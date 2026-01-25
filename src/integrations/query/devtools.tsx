import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export const queryDevtoolsPlugin = {
  name: 'TanStack Query',
  render: <ReactQueryDevtools buttonPosition="bottom-right" />,
}
