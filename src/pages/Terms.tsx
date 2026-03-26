import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Scale, Shield, Clock, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link 
              to="/" 
              className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-lg font-semibold">Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link 
                to="/privacy-policy" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link 
                to="/login" 
                className="px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-md hover:bg-muted transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Scale className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground mt-2">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Acceptance of Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                Acceptance of Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                By accessing or using MessFlow ("the Service"), you agree to be bound by these Terms of Service. 
                If you disagree with any part of the terms, you may not access the Service.
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">
                  You must be at least 18 years old to use this service
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">
                  You agree to provide accurate and complete information
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Account Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-5 w-5" />
                Account Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Your Responsibilities</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Maintain account security</li>
                    <li>• Keep login credentials confidential</li>
                    <li>• Notify us of unauthorized access</li>
                    <li>• Use the service lawfully</li>
                    <li>• Provide accurate business information</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Prohibited Activities</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Violating any applicable laws</li>
                    <li>• Interfering with service operation</li>
                    <li>• Accessing unauthorized data</li>
                    <li>• Reverse engineering the software</li>
                    <li>• Sharing accounts without permission</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                Service Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">License</h4>
                  <p className="text-sm text-muted-foreground">
                    We grant you a limited, non-exclusive, non-transferable license to access and use 
                    the Service for your mess management operations.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Restrictions</h4>
                  <p className="text-sm text-muted-foreground">
                    You may not: modify, copy, distribute, transmit, display, perform, reproduce, 
                    publish, license, create derivative works from, transfer, or sell any information 
                    or software obtained from the Service.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                Payment Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Subscription Fees</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Fees are charged monthly in advance</li>
                    <li>• Prices are subject to change with 30 days notice</li>
                    <li>• All fees are non-refundable</li>
                    <li>• Automatic renewal unless canceled</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Free Trial</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 14-day free trial available</li>
                    <li>• No credit card required</li>
                    <li>• Automatic conversion to paid plan</li>
                    <li>• Can be canceled anytime during trial</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data and Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-5 w-5" />
                Data and Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Your Data</h4>
                  <p className="text-sm text-muted-foreground">
                    You retain ownership of all data you input into the Service. We process this data 
                    to provide and improve our services in accordance with our Privacy Policy.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Backup Responsibility</h4>
                  <p className="text-sm text-muted-foreground">
                    While we implement backup procedures, you are responsible for maintaining 
                    separate backup copies of your data. We are not liable for data loss.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5" />
                Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                In no event shall MessFlow, nor its directors, employees, partners, suppliers, or affiliates, 
                be liable for any indirect, incidental, special, consequential or punitive damages, including 
                without limitation, loss of profits, data, use, goodwill, or other intangible losses, 
                resulting from your access to or use of or inability to access or use the Service.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Maximum Liability</h4>
                  <p className="text-sm text-muted-foreground">
                    Our total liability to you for all claims arising out of or relating to these Terms 
                    or the Service shall not exceed the amount you paid to us in the last six months.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Exclusions</h4>
                  <p className="text-sm text-muted-foreground">
                    Some jurisdictions do not allow the exclusion or limitation of liability for consequential 
                    or incidental damages, so the above limitation may not apply to you.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Clock className="h-5 w-5" />
                Termination
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">By You</h4>
                  <p className="text-sm text-muted-foreground">
                    You may terminate your account at any time by contacting us or through your account settings. 
                    Upon termination, your right to use the Service will immediately cease.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">By Us</h4>
                  <p className="text-sm text-muted-foreground">
                    We may terminate or suspend your account immediately, without prior notice or liability, 
                    for any reason whatsoever, including without limitation if you breach the Terms.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Upon termination, your data will be retained for 30 days and then permanently deleted. 
                  We recommend exporting your data before termination.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Clock className="h-5 w-5" />
                Changes to Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
                If a revision is material, we will provide at least 30 days' notice prior to any new terms 
                taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-semibold mb-2">Email</h5>
                  <p className="text-sm text-muted-foreground">
                    support@messflow.com
                  </p>
                </div>
                <div>
                  <h5 className="font-semibold mb-2">WhatsApp</h5>
                  <p className="text-sm text-muted-foreground">
                    +971 50 123 4567
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                By using our service, you acknowledge that you have read, understood, and agree to be bound 
                by these Terms of Service.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}