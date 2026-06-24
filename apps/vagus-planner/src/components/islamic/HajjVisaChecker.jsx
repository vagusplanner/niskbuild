import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, FileText, Loader2, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import HajjFeedbackButton from './HajjFeedbackButton';

export default function HajjVisaChecker({ travelDate = null }) {
  const [nationality, setNationality] = useState('');
  const [visaType, setVisaType] = useState('umrah');
  const [loading, setLoading] = useState(false);
  const [visaInfo, setVisaInfo] = useState(null);
  const [travelAdvisories, setTravelAdvisories] = useState(null);

  const checkVisa = async () => {
    if (!nationality) {
      toast.error('Please select your nationality');
      return;
    }

    setLoading(true);
    try {
      // Fetch both visa info and travel advisories in parallel
      const [visaRes, advisoryRes] = await Promise.all([
        base44.functions.invoke('getVisaAndConditions', {
          nationality,
          visa_type: visaType,
          travel_date: travelDate || new Date().toISOString().split('T')[0]
        }),
        base44.functions.invoke('getTravelAdvisories', {
          travel_date: travelDate || new Date().toISOString().split('T')[0],
          destination: 'Saudi Arabia'
        })
      ]);

      setVisaInfo(visaRes.data);
      setTravelAdvisories(advisoryRes.data);
      toast.success('Visa and travel information updated!');
    } catch (error) {
      toast.error('Failed to fetch visa information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visa Requirements Checker</CardTitle>
          <p className="text-sm text-slate-600">Check visa requirements based on your nationality</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Nationality</label>
              <Select value={nationality} onValueChange={setNationality}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="PK">Pakistan</SelectItem>
                  <SelectItem value="BD">Bangladesh</SelectItem>
                  <SelectItem value="EG">Egypt</SelectItem>
                  <SelectItem value="TR">Turkey</SelectItem>
                  <SelectItem value="MY">Malaysia</SelectItem>
                  <SelectItem value="ID">Indonesia</SelectItem>
                  <SelectItem value="NG">Nigeria</SelectItem>
                  <SelectItem value="ZA">South Africa</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Visa Type</label>
              <Select value={visaType} onValueChange={setVisaType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="umrah">Umrah Visa</SelectItem>
                  <SelectItem value="hajj">Hajj Visa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={checkVisa}
            disabled={loading || !nationality}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Visa Requirements'
            )}
          </Button>
        </CardContent>
      </Card>

      {travelAdvisories && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Travel Advisories & Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Security Level */}
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="font-semibold">Security Level</span>
              <Badge className={
                travelAdvisories.security_level === 'safe' ? 'bg-green-600' :
                travelAdvisories.security_level === 'moderate' ? 'bg-yellow-600' :
                travelAdvisories.security_level === 'cautious' ? 'bg-orange-600' :
                'bg-red-600'
              }>
                {travelAdvisories.security_level?.toUpperCase()}
              </Badge>
            </div>

            {/* Travel Advisories */}
            {travelAdvisories.travel_advisories?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Current Advisories
                </h4>
                <ul className="space-y-1">
                  {travelAdvisories.travel_advisories.map((adv, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <div className="w-1 h-1 bg-amber-600 rounded-full mt-2" />
                      {adv}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Health Alerts */}
            {travelAdvisories.health_alerts?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Health Alerts</h4>
                {travelAdvisories.health_alerts.map((alert, idx) => (
                  <div key={idx} className={`p-2 rounded mb-2 text-sm ${
                    alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.alert}
                  </div>
                ))}
              </div>
            )}

            {/* Seasonal Info */}
            {travelAdvisories.seasonal_info && (
              <div className="p-3 bg-white rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Seasonal Information
                </h4>
                <p className="text-sm text-slate-700 mb-2">{travelAdvisories.seasonal_info.weather_conditions}</p>
                {travelAdvisories.seasonal_info.considerations?.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {travelAdvisories.seasonal_info.considerations.map((c, idx) => (
                      <li key={idx} className="text-slate-600 flex items-start gap-2">
                        <TrendingUp className="w-3 h-3 mt-0.5" />
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Local Holidays */}
            {travelAdvisories.local_holidays?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Local Holidays</h4>
                <ul className="text-sm space-y-1">
                  {travelAdvisories.local_holidays.map((holiday, idx) => (
                    <li key={idx} className="text-slate-700">{holiday}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Travel Tips */}
            {travelAdvisories.travel_tips?.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Travel Tips</h4>
                <ul className="space-y-1">
                  {travelAdvisories.travel_tips.map((tip, idx) => (
                    <li key={idx} className="text-sm text-green-800">✓ {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {visaInfo && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Visa Requirements & Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {/* Eligibility */}
            <div className="flex items-center gap-2">
              {visaInfo.visa_eligibility?.eligible ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-semibold">
                {visaInfo.visa_eligibility?.eligible ? 'Eligible for visa' : 'Visa restrictions may apply'}
              </span>
            </div>
            {visaInfo.visa_eligibility?.notes && (
              <p className="text-sm text-slate-600">{visaInfo.visa_eligibility.notes}</p>
            )}

            {/* Application Process */}
            {visaInfo.application?.process && (
              <div>
                <h4 className="font-semibold mb-2">Application Process:</h4>
                <p className="text-sm text-slate-700">{visaInfo.application.process}</p>
              </div>
            )}

            {/* Required Documents */}
            {visaInfo.application?.required_documents && (
              <div>
                <h4 className="font-semibold mb-2">Required Documents:</h4>
                <ul className="space-y-1">
                  {visaInfo.application.required_documents.map((doc, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span>{doc.document}</span>
                        {doc.notes && <p className="text-xs text-slate-500 mt-0.5">{doc.notes}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Entry Requirements */}
            {visaInfo.entry_requirements && (
              <div>
                <h4 className="font-semibold mb-2">Entry Requirements:</h4>
                <ul className="space-y-1 text-sm text-slate-700">
                  {visaInfo.entry_requirements.passport_validity && (
                    <li>Passport valid for: {visaInfo.entry_requirements.passport_validity}</li>
                  )}
                  {visaInfo.entry_requirements.vaccinations?.length > 0 && (
                    <li>
                      <strong>Required Vaccinations:</strong>
                      {visaInfo.entry_requirements.vaccinations.map((v, i) => (
                        <div key={i} className="ml-3">• {v}</div>
                      ))}
                    </li>
                  )}
                  {visaInfo.entry_requirements.health_insurance && (
                    <li>✓ Health insurance required</li>
                  )}
                  {visaInfo.entry_requirements.return_ticket && (
                    <li>✓ Return ticket required</li>
                  )}
                </ul>
              </div>
            )}

            {/* Validity Details */}
            {visaInfo.valid_for && (
              <div className="p-3 bg-white rounded-lg space-y-1">
                <p className="text-sm"><strong>Duration of stay:</strong> {visaInfo.valid_for.duration}</p>
                <p className="text-sm"><strong>Entries:</strong> {visaInfo.valid_for.entries}</p>
                <p className="text-sm"><strong>Visa validity:</strong> {visaInfo.valid_for.validity_period}</p>
              </div>
            )}

            {/* Real-Time Status */}
            {visaInfo.real_time_status && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <h4 className="font-semibold text-blue-900">Current Status</h4>
                {visaInfo.real_time_status.current_processing_delays && (
                  <p className="text-sm text-blue-800"><strong>Processing:</strong> {visaInfo.real_time_status.current_processing_delays}</p>
                )}
                {visaInfo.real_time_status.seasonal_advisories && (
                  <p className="text-sm text-blue-800"><strong>Seasonal:</strong> {visaInfo.real_time_status.seasonal_advisories}</p>
                )}
              </div>
            )}

            {/* Cost and Duration */}
            <div className="grid grid-cols-2 gap-4">
              {visaInfo.application?.cost && (
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-slate-600">Estimated Cost</p>
                  <p className="font-semibold">{visaInfo.application.cost}</p>
                </div>
              )}
              {visaInfo.application?.processing_time && (
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-slate-600">Processing Time</p>
                  <p className="font-semibold">{visaInfo.application.processing_time}</p>
                </div>
              )}
            </div>

            {/* Pro Tips */}
            {visaInfo.pro_tips?.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Pro Tips for Approval</h4>
                <ul className="space-y-1">
                  {visaInfo.pro_tips.map((tip, idx) => (
                    <li key={idx} className="text-sm text-green-800">💡 {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Feedback */}
            <div className="pt-4 border-t">
              <HajjFeedbackButton
                feedbackType="visa_info"
                context={{ nationality, visa_type: visaType }}
                pilgrimageType={visaType}
                showInaccuracyReport
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}