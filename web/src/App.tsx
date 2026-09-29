import { ThemeProvider } from "@/components/theme-provider"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <h1 className="text-3xl font-bold underline text-foreground">
          Hello world!
        </h1>
      </div>
    </ThemeProvider>
  )
}


export default App