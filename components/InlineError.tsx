const InlineError = ({ message }: { message: string | null }) => {
  if (!message) {
    return null
  }

  return (
    <p role="alert" className="text-sm font-medium text-red-700">
      {message}
    </p>
  )
}

export default InlineError
