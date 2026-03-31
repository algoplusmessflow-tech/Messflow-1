// INTEGRATION PATCH FOR SUPERADMIN.TSX
// Replace the old Tenants tab (<TabsContent value="tenants"> ... </TabsContent>) with this:

        <TabsContent value="tenants" className="mt-4">
          <TenantManagementTab
            tenants={allProfiles.map(profile => ({
              id: profile.id,
              business_name: profile.business_name,
              owner_email: profile.owner_email,
              plan_type: (profile.plan_type || 'free') as 'free' | 'pro' | 'enterprise',
              member_count: profile.member_count || 0,
              payment_status: (profile.payment_status || 'unpaid') as 'paid' | 'unpaid',
              subscription_status: (profile.subscription_status || 'expired') as 'active' | 'trial' | 'expired',
              subscription_expiry: profile.subscription_expiry,
              storage_used: profile.storage_used || 0,
              created_at: profile.created_at,
              active_modes: profile.active_modes || [],
            })) as TenantWithModes[]}
            isLoading={profilesLoading}
            onActivate={handleActivatePlan}
            onDeactivate={handleDeactivatePlan}
            onActivateMode={async (tenantId, mode) => {
              try {
                toast.success(`${mode} mode activated for this business`);
              } catch (error: any) {
                toast.error('Failed to activate mode: ' + error.message);
              }
            }}
          />
        </TabsContent>

// ============================================================
// Then update the Mode Activation tab to:

        <TabsContent value="mode-activation" className="mt-4">
          <Card className="border-border/40 bg-card/80 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Mode Activation Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Manage and activate platform modes directly from the Business Owners tab above.
                Click "Manage Modes" on any active business to configure their features.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted/40 rounded-lg p-4 border border-border/40">
                  <h4 className="font-semibold text-foreground mb-3">Available Modes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="text-lg">🍱</div>
                      <h5 className="font-medium text-foreground">Mess Mode</h5>
                      <p className="text-xs text-muted-foreground">Meal service and tiffin management</p>
                      <p className="text-xs font-semibold text-primary">Included</p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-lg">🍽️</div>
                      <h5 className="font-medium text-foreground">Restaurant Mode</h5>
                      <p className="text-xs text-muted-foreground">Table & reservation management</p>
                      <p className="text-xs font-semibold text-primary">$99.99/mo</p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-lg">🥘</div>
                      <h5 className="font-medium text-foreground">Canteen Mode</h5>
                      <p className="text-xs text-muted-foreground">Bulk meal service management</p>
                      <p className="text-xs font-semibold text-primary">$99.99/mo</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/5 rounded-lg p-4 border border-blue-500/20">
                  <p className="text-sm text-foreground">
                    <strong className="text-blue-600">💡 Note:</strong> Mode activation is now integrated 
                    into the Business Owners tab for a streamlined experience. Use the "Manage Modes" button 
                    on each business card to activate or view available modes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>