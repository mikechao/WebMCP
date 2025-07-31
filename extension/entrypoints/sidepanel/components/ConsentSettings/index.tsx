import React, { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Trash2, Shield, Info, Settings } from 'lucide-react';

interface ConsentDecision {
  domain: string;
  granted: boolean;
  timestamp: number;
  permanent: boolean;
}

export default function ConsentSettings(): React.ReactElement {
  const [consentDecisions, setConsentDecisions] = useState<Record<string, ConsentDecision>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConsentDecisions();
  }, []);

  const loadConsentDecisions = async () => {
    try {
      const result = await chrome.storage.local.get('mcp_consent_decisions');
      setConsentDecisions(result.mcp_consent_decisions || {});
    } catch (error) {
      console.error('Failed to load consent decisions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeConsent = async (domain: string) => {
    try {
      // Send message to background to handle consent removal and disconnection
      await chrome.runtime.sendMessage({
        type: 'remove-consent',
        domain: domain
      });
      
      // Update local state by reloading
      await loadConsentDecisions();
    } catch (error) {
      console.error('Failed to remove consent:', error);
    }
  };

  const clearAllConsent = async () => {
    try {
      // Send message to background to handle clearing all consent
      await chrome.runtime.sendMessage({
        type: 'clear-all-consent'
      });
      
      // Update local state
      setConsentDecisions({});
    } catch (error) {
      console.error('Failed to clear all consent:', error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const grantedDomains = Object.values(consentDecisions).filter(d => d.granted);
  const deniedDomains = Object.values(consentDecisions).filter(d => !d.granted);

  if (isLoading) {
    return (
      <div className="h-full p-3">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4" />
          <h2 className="text-sm font-medium">MCP Consent Settings</h2>
        </div>
        <div className="text-center py-8">
          <div className="animate-pulse">Loading consent settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4" />
        <h2 className="text-sm font-medium">MCP Consent Settings</h2>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className="text-xs">Security Notice</AlertTitle>
        <AlertDescription className="text-xs">
          MCP servers can access and interact with web page data. Only grant consent to websites you trust.
        </AlertDescription>
      </Alert>

      {grantedDomains.length === 0 && deniedDomains.length === 0 ? (
        <Card className="p-4 text-center">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No consent decisions yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Visit MCP-enabled websites to manage permissions
          </p>
        </Card>
      ) : (
        <>
          {grantedDomains.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-green-600">Allowed Domains</h3>
                <Badge variant="secondary" className="text-xs">
                  {grantedDomains.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {grantedDomains.map((decision) => (
                  <Card key={decision.domain} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-sm font-medium truncate">
                            {decision.domain}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={decision.permanent ? "default" : "secondary"} 
                            className="text-xs h-4"
                          >
                            {decision.permanent ? 'Always' : 'Session'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(decision.timestamp)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeConsent(decision.domain)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {deniedDomains.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-red-600">Denied Domains</h3>
                <Badge variant="secondary" className="text-xs">
                  {deniedDomains.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {deniedDomains.map((decision) => (
                  <Card key={decision.domain} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          <span className="text-sm font-medium truncate">
                            {decision.domain}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs h-4">
                            Denied
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(decision.timestamp)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeConsent(decision.domain)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              onClick={clearAllConsent}
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              disabled={grantedDomains.length === 0 && deniedDomains.length === 0}
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Clear All Consent Decisions
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
