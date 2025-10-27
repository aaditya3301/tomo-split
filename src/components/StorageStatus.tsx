import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Cloud, 
  CloudOff, 
  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'

interface StorageStatusProps {
  isConfigured: boolean
  isUploading: boolean
  isLoading: boolean
  lastUploadHash: string | null
  error: string | null
  onSave: () => void
  onLoad: () => void
  onClearError: () => void
}

const StorageStatus: React.FC<StorageStatusProps> = ({
  isConfigured,
  isUploading,
  isLoading,
  lastUploadHash,
  error,
  onSave,
  onLoad,
  onClearError
}) => {
  const getStatusIcon = () => {
    if (!isConfigured) return <CloudOff className="h-4 w-4 text-red-500" />
    if (isUploading || isLoading) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    if (lastUploadHash) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <Cloud className="h-4 w-4 text-gray-500" />
  }

  const getStatusText = () => {
    if (!isConfigured) return 'Storage not configured'
    if (isUploading) return 'Uploading to Filecoin...'
    if (isLoading) return 'Loading from storage...'
    if (lastUploadHash) return 'Data synced'
    return 'Ready to sync'
  }

  const getStatusColor = () => {
    if (!isConfigured) return 'destructive'
    if (isUploading || isLoading) return 'default'
    if (lastUploadHash) return 'default'
    return 'secondary'
  }

  return (
    <div className="space-y-3">
      {/* Storage Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <Badge variant={getStatusColor() as any} className="text-xs">
            {getStatusText()}
          </Badge>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoad}
            disabled={!isConfigured || isLoading || isUploading}
            className="flex items-center space-x-1"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">Load</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={!isConfigured || isLoading || isUploading}
            className="flex items-center space-x-1"
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">Save</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearError}
              className="h-6 px-2 text-xs"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Warning */}
      {!isConfigured && (
        <Alert className="text-xs">
          <CloudOff className="h-3 w-3" />
          <AlertDescription>
            Add <code className="bg-muted px-1 rounded">VITE_STORAGE_API_KEY</code> to your .env file to enable Filecoin storage.
          </AlertDescription>
        </Alert>
      )}

      {/* Success Info */}
      {lastUploadHash && (
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Last sync:</span>
            <code className="bg-muted px-1 rounded font-mono">
              {lastUploadHash.substring(0, 8)}...{lastUploadHash.substring(-6)}
            </code>
          </div>
        </div>
      )}
    </div>
  )
}

export default StorageStatus
