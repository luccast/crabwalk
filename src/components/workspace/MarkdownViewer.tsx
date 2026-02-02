import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { FileText, AlertCircle, Star } from 'lucide-react'
import { motion } from 'framer-motion'

interface MarkdownViewerProps {
  content: string
  fileName: string
  filePath?: string
  fileSize?: number
  fileModified?: Date
  error?: string
  isStarred?: boolean
  onStar?: (path: string) => void
}

// Format file size to human-readable format
function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) return ''
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Format date to relative time
function formatModifiedDate(date: Date | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 30) {
    return d.toLocaleDateString()
  } else if (days > 0) {
    return `${days}d ago`
  } else if (hours > 0) {
    return `${hours}h ago`
  } else if (minutes > 0) {
    return `${minutes}m ago`
  } else {
    return 'just now'
  }
}

export function MarkdownViewer({ content, fileName, filePath, fileSize, fileModified, error, isStarred, onStar }: MarkdownViewerProps) {
  const isMarkdown = useMemo(() => {
    return fileName.toLowerCase().endsWith('.md') || fileName.toLowerCase().endsWith('.markdown')
  }, [fileName])

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-crab-900/30 flex items-center justify-center border border-crab-700/50">
            <AlertCircle size={32} className="text-crab-400" />
          </div>
          <div>
            <h3 className="font-display text-lg text-crab-400 mb-2">Error Loading File</h3>
            <p className="font-console text-sm text-shell-500 max-w-md">{error}</p>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!content && !fileName) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-shell-800/50 flex items-center justify-center border border-shell-700">
            <FileText size={32} className="text-shell-500" />
          </div>
          <div>
            <h3 className="font-display text-lg text-gray-400 mb-2">No File Selected</h3>
            <p className="font-console text-sm text-shell-500 max-w-md">
              Select a file from the sidebar to view its contents
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* File header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-shell-800 bg-shell-900/50">
        {/* Star button */}
        {filePath && onStar && (
          <button
            onClick={() => onStar(filePath)}
            className={`p-1 rounded transition-colors ${
              isStarred
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-shell-600 hover:text-yellow-400'
            }`}
            title={isStarred ? 'Unstar file' : 'Star file'}
          >
            <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
          </button>
        )}
        <FileText size={18} className={isMarkdown ? 'text-crab-400' : 'text-shell-500'} />
        <h2 className="font-display text-sm text-gray-200">{fileName}</h2>
        {isMarkdown && (
          <span className="px-2 py-0.5 bg-crab-900/30 text-crab-400 text-[10px] font-console uppercase rounded border border-crab-700/30">
            Markdown
          </span>
        )}
        {/* File metadata */}
        <div className="flex items-center gap-3 ml-auto">
          {fileSize !== undefined && (
            <span className="font-console text-[10px] text-shell-500">
              {formatFileSize(fileSize)}
            </span>
          )}
          {fileModified && (
            <span className="font-console text-[10px] text-shell-500">
              {formatModifiedDate(fileModified)}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isMarkdown ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-display text-crab-400 mb-4 pb-2 border-b border-shell-800">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-display text-neon-mint mt-6 mb-3">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-display text-gray-200 mt-4 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-gray-300 leading-relaxed mb-4">{children}</p>
                ),
                code: ({ children, className }) => {
                  const isInline = !className
                  return isInline ? (
                    <code className="bg-shell-800 text-neon-peach px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-shell-900 border border-shell-800 rounded-lg p-4 overflow-x-auto mb-4">
                      <code className="text-sm font-mono text-gray-300">{children}</code>
                    </pre>
                  )
                },
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-1">{children}</ol>
                ),
                li: ({ children }) => <li className="text-gray-300">{children}</li>,
                a: ({ children, href }) => (
                  <a
                    href={href}
                    className="text-neon-cyan hover:text-neon-mint transition-colors underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-crab-500 pl-4 italic text-shell-400 mb-4">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="border-shell-700 my-6" />,
                table: ({ children }) => (
                  <table className="w-full border-collapse mb-4">{children}</table>
                ),
                thead: ({ children }) => (
                  <thead className="bg-shell-800">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="border border-shell-700 px-4 py-2 text-left font-display text-sm text-gray-200">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-shell-700 px-4 py-2 text-sm text-gray-300">
                    {children}
                  </td>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap">{content}</pre>
        )}
      </div>
    </div>
  )
}

export default MarkdownViewer
