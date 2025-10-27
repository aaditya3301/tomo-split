import React from 'react'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const PlaceholderWarning: React.FC = () => {
  const isPlaceholder = import.meta.env.VITE_PROJECT_ID === 'sample_project_id_placeholder'
  
  if (!isPlaceholder) return null

  return (
    <Alert className="mx-6 mt-20 mb-4 border-accent/50 bg-accent/10">
      <AlertTriangle className="h-4 w-4 text-accent" />
      <AlertDescription className="text-accent-foreground">
        <strong>Demo Mode:</strong> Using placeholder Project ID. 
        Google sign-in and social logins won't work. 
        <a 
          href="https://dashboard.reown.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center ml-2 text-accent hover:text-accent/80 underline"
        >
          Get your Project ID
          <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </AlertDescription>
    </Alert>
  )
}

export default PlaceholderWarning
