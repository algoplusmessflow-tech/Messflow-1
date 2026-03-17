import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useKitchenPrep } from '@/hooks/useKitchenPrep';
import { format, addDays, subDays } from 'date-fns';
import { 
  ChefHat, 
  UtensilsCrossed, 
  Soup, 
  Beef, 
  Leaf, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Wheat
} from 'lucide-react';

function StatCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  subtitle?: string;
}) {
  const variantClasses = {
    default: 'text-foreground',
    success: 'text-green-500',
    warning: 'text-amber-500',
    destructive: 'text-red-500',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${variantClasses[variant]}`}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function KitchenPrep() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealFilter, setMealFilter] = useState<'all' | 'lunch' | 'dinner'>('all');
  
  const { 
    prepSummary, 
    prepByArea, 
    prepList, 
    summaryLoading, 
    areaLoading, 
    listLoading 
  } = useKitchenPrep(selectedDate.toISOString().split('T')[0]);

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handleToday = () => setSelectedDate(new Date());

  const filteredList = prepList.filter(item => {
    if (mealFilter === 'all') return true;
    if (mealFilter === 'lunch') return item.mealType === 'lunch' || item.mealType === 'both';
    if (mealFilter === 'dinner') return item.mealType === 'dinner' || item.mealType === 'both';
    return true;
  });

  const getMealTypeBadge = (type: string) => {
    switch (type) {
      case 'lunch': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Lunch</Badge>;
      case 'dinner': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Dinner</Badge>;
      case 'both': return <Badge className="bg-blue-500">Both</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getDietBadge = (diet: string) => {
    switch (diet) {
      case 'veg': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Leaf className="h-3 w-3 mr-1" />Veg</Badge>;
      case 'non_veg': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><Beef className="h-3 w-3 mr-1" />Non-Veg</Badge>;
      case 'both': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Both</Badge>;
      default: return <Badge variant="outline">{diet}</Badge>;
    }
  };

  const getRiceLabel = (rice: string) => {
    switch (rice) {
      case 'white_rice': return 'White Rice';
      case 'brown_rice': return 'Brown Rice';
      case 'jeeraga_sala': return 'Jeeraga Sala';
      case 'none': return 'No Rice';
      default: return rice;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ChefHat className="h-6 w-6" />
              Kitchen Prep
            </h1>
            <p className="text-muted-foreground">Daily meal preparation overview</p>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="border-0 h-8 w-32"
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleToday}>
              Today
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Deliveries"
            value={prepSummary.totalMeals}
            icon={UtensilsCrossed}
          />
          <StatCard
            title="Lunch"
            value={prepSummary.lunchCount + prepSummary.bothCount}
            icon={UtensilsCrossed}
            variant="warning"
            subtitle="meals"
          />
          <StatCard
            title="Dinner"
            value={prepSummary.dinnerCount + prepSummary.bothCount}
            icon={UtensilsCrossed}
            variant="destructive"
            subtitle="meals"
          />
          <StatCard
            title="Total Rotis"
            value={prepSummary.totalRotis}
            icon={Wheat}
            subtitle="pieces"
          />
          <StatCard
            title="Veg"
            value={prepSummary.vegCount}
            icon={Leaf}
            variant="success"
          />
          <StatCard
            title="Non-Veg"
            value={prepSummary.nonVegCount}
            icon={Beef}
            variant="destructive"
          />
        </div>

        {/* Rice & Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Soup className="h-4 w-4" />
                Rice Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">White Rice</span>
                <span className="font-medium">{prepSummary.whiteRiceCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Brown Rice</span>
                <span className="font-medium">{prepSummary.brownRiceCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jeeraga Sala</span>
                <span className="font-medium">{prepSummary.jeeragaSalaCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">No Rice</span>
                <span className="font-medium">{prepSummary.noRiceCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Service Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paused</span>
                <span className="font-medium">{prepSummary.pausedCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Skip Weekends</span>
                <span className="font-medium">{prepSummary.weekendSkipCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Free Trial</span>
                <span className="font-medium">{prepSummary.trialCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custom Diet</span>
                <span className="font-medium">{prepSummary.customDietCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Dietary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Vegetarian</span>
                <span className="font-medium">{prepSummary.vegCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Non-Veg</span>
                <span className="font-medium">{prepSummary.nonVegCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-orange-600">Both</span>
                <span className="font-medium">{prepSummary.bothDietCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Prep Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {prepSummary.totalMeals > 0 
                  ? Math.round((prepSummary.totalMeals / (prepSummary.totalMeals + prepSummary.pausedCount)) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">active of total</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="queue">Prep Queue</TabsTrigger>
            <TabsTrigger value="areas">By Area</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <Label className="text-sm text-muted-foreground">Filter:</Label>
              <div className="flex gap-2">
                <Button
                  variant={mealFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMealFilter('all')}
                >
                  All Meals
                </Button>
                <Button
                  variant={mealFilter === 'lunch' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMealFilter('lunch')}
                >
                  Lunch
                </Button>
                <Button
                  variant={mealFilter === 'dinner' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMealFilter('dinner')}
                >
                  Dinner
                </Button>
              </div>
              <span className="text-sm text-muted-foreground ml-auto">
                {filteredList.length} meals
              </span>
            </div>

            {/* Prep Queue */}
            {listLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No meals to prepare</h3>
                  <p className="text-muted-foreground">
                    {prepSummary.pausedCount > 0 
                      ? `${prepSummary.pausedCount} customers have paused service`
                      : 'No active deliveries for this date'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredList.map((member) => (
                  <Card key={member.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{member.name}</span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </div>
                          </div>
                          {member.deliveryAreaName && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {member.deliveryAreaName}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {getMealTypeBadge(member.mealType)}
                          {getDietBadge(member.dietaryPreference)}
                          <div className="flex items-center gap-1 text-sm">
                            <span className="font-medium">{member.rotiQuantity}</span>
                            <Wheat className="h-4 w-4 text-amber-500" />
                          </div>
                          <div className="text-sm text-muted-foreground min-w-[80px]">
                            {getRiceLabel(member.riceType)}
                          </div>
                          {member.freeTrial && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Trial
                            </Badge>
                          )}
                        </div>
                      </div>
                      {member.address && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {member.address}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="areas" className="space-y-4">
            {areaLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : prepByArea.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No delivery areas</h3>
                  <p className="text-muted-foreground">Add delivery areas to see breakdown by area</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prepByArea.filter(a => a.totalMeals > 0).map((area) => (
                  <Card key={area.areaId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {area.areaName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Meals</span>
                        <span className="font-medium">{area.totalMeals}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Lunch</span>
                        <span className="font-medium">{area.lunchCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dinner</span>
                        <span className="font-medium">{area.dinnerCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rotis</span>
                        <span className="font-medium">{area.totalRotis}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Veg</span>
                        <span className="font-medium text-green-600">{area.vegCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Non-Veg</span>
                        <span className="font-medium text-red-600">{area.nonVegCount}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
