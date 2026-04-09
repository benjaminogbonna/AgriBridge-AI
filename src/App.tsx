/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sprout, 
  Bug, 
  CloudSun, 
  Languages, 
  WifiOff, 
  Wifi, 
  Send, 
  User, 
  Bot, 
  ChevronRight, 
  Info,
  ThumbsUp,
  ThumbsDown,
  Mic,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { 
  getChatResponse, 
  diagnoseCrop, 
  getPlantingAdvice, 
  DiagnosisResult, 
  PlantingAdvice 
} from './services/geminiService';

// Mock data for offline mode
const MOCK_KNOWLEDGE = {
  maize: {
    diagnosis: {
      "yellow leaves": {
        disease: "Nitrogen Deficiency",
        cause: "Not enough food in the soil for the maize.",
        treatment: "Apply urea fertilizer or well-rotted chicken manure.",
        prevention: "Mix compost into the soil before planting next time."
      },
      "holes in leaves": {
        disease: "Fall Armyworm",
        cause: "Small caterpillars eating the leaves.",
        treatment: "Handpick them or use neem seed extract spray.",
        prevention: "Check crops every morning and plant early in the season."
      }
    }
  },
  cassava: {
    diagnosis: {
      "twisted leaves": {
        disease: "Cassava Mosaic Virus",
        cause: "Tiny whiteflies carrying a sickness from other plants.",
        treatment: "Uproot and burn sick plants to stop it from spreading.",
        prevention: "Only use healthy stems from trusted sources for planting."
      }
    }
  }
};

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isOffline, setIsOffline] = useState(false);
  const [language, setLanguage] = useState('English');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      text: "Welcome to AgriBridge AI! I am your farming assistant. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Diagnosis State
  const [diagCrop, setDiagCrop] = useState('');
  const [diagSymptoms, setDiagSymptoms] = useState('');
  const [diagResult, setDiagResult] = useState<DiagnosisResult | null>(null);

  // Advisory State
  const [advLocation, setAdvLocation] = useState('');
  const [advCrop, setAdvCrop] = useState('');
  const [advMonth, setAdvMonth] = useState('');
  const [advResult, setAdvResult] = useState<PlantingAdvice | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    if (isOffline) {
      setTimeout(() => {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          text: "[OFFLINE MODE] I'm currently using preloaded knowledge. For full AI advice, please turn on online mode. \n\nGeneral tip: Ensure your soil is well-drained and use organic mulch to keep moisture.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const response = await getChatResponse(input, language);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      toast.error("Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiagnose = async () => {
    if (!diagCrop || !diagSymptoms) {
      toast.error("Please provide both crop and symptoms");
      return;
    }

    setIsLoading(true);
    setDiagResult(null);

    if (isOffline) {
      setTimeout(() => {
        const cropKey = diagCrop.toLowerCase();
        const symptomKey = diagSymptoms.toLowerCase();
        
        // Simple mock lookup
        let result = null;
        if (MOCK_KNOWLEDGE[cropKey as keyof typeof MOCK_KNOWLEDGE]) {
          const cropData = MOCK_KNOWLEDGE[cropKey as keyof typeof MOCK_KNOWLEDGE].diagnosis;
          for (const key in cropData) {
            if (symptomKey.includes(key)) {
              result = cropData[key as keyof typeof cropData];
              break;
            }
          }
        }

        if (result) {
          setDiagResult(result);
        } else {
          setDiagResult({
            disease: "Unknown Condition (Offline)",
            cause: "I don't have this symptom in my offline memory.",
            treatment: "Try to keep the plant watered and remove any dead parts.",
            prevention: "Consult an extension officer when you are back online."
          });
        }
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const result = await diagnoseCrop(diagCrop, diagSymptoms);
      setDiagResult(result);
    } catch (error) {
      toast.error("Diagnosis failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetAdvice = async () => {
    if (!advLocation || !advCrop || !advMonth) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setAdvResult(null);

    if (isOffline) {
      setTimeout(() => {
        setAdvResult({
          bestTime: "Early Rainy Season (Simulated)",
          climateAdvice: "Ensure you plant after the first three heavy rains.",
          risks: ["Early dry spell", "Soil erosion"]
        });
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const result = await getPlantingAdvice(advLocation, advCrop, advMonth);
      setAdvResult(result);
    } catch (error) {
      toast.error("Advice failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-brand-cream border-x border-brand-green/10 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="bg-brand-green text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-white p-1.5 rounded-lg">
              <Sprout className="text-brand-green w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AgriBridge AI</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 px-2 py-1 rounded-full">
              {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
              <Switch 
                checked={!isOffline} 
                onCheckedChange={(val) => setIsOffline(!val)}
                className="data-[state=checked]:bg-brand-amber"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <Languages className="w-4 h-4 opacity-70" />
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-8 bg-white/10 border-none text-xs w-32">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Pidgin English">Pidgin</SelectItem>
              <SelectItem value="Yoruba">Yoruba</SelectItem>
              <SelectItem value="Hausa">Hausa</SelectItem>
              <SelectItem value="Igbo">Igbo</SelectItem>
              <SelectItem value="French">Français</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="grid grid-cols-3 w-full bg-brand-green/5 p-1 rounded-xl">
              <TabsTrigger value="chat" className="rounded-lg data-[state=active]:bg-brand-green data-[state=active]:text-white">
                <Bot className="w-4 h-4 mr-2" /> Chat
              </TabsTrigger>
              <TabsTrigger value="diagnose" className="rounded-lg data-[state=active]:bg-brand-green data-[state=active]:text-white">
                <Bug className="w-4 h-4 mr-2" /> Health
              </TabsTrigger>
              <TabsTrigger value="planting" className="rounded-lg data-[state=active]:bg-brand-green data-[state=active]:text-white">
                <CloudSun className="w-4 h-4 mr-2" /> Planting
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {/* Chat Tab */}
            <TabsContent value="chat" className="h-full m-0 flex flex-col">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4 pb-4">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-brand-green text-white rounded-tr-none' 
                          : 'bg-white text-brand-earth rounded-tl-none border border-brand-green/5'
                      }`}>
                        <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] uppercase font-bold tracking-wider">
                          {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                          {msg.role === 'user' ? 'You' : 'AgriBridge AI'}
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <div className="mt-2 flex justify-end">
                          <span className="text-[9px] opacity-50">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-brand-green/5 shadow-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-green" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="p-4 bg-white border-t border-brand-green/10">
                <div className="flex gap-2 items-center">
                  <Button variant="outline" size="icon" className="shrink-0 rounded-full border-brand-green/20 text-brand-green">
                    <Mic className="w-4 h-4" />
                  </Button>
                  <div className="relative flex-1">
                    <Input 
                      placeholder="Ask a farming question..." 
                      className="rounded-full pr-10 border-brand-green/20 focus-visible:ring-brand-green"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <Button 
                      size="icon" 
                      className="absolute right-1 top-1 h-8 w-8 rounded-full bg-brand-green hover:bg-brand-green/90"
                      onClick={handleSend}
                      disabled={isLoading}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Diagnosis Tab */}
            <TabsContent value="diagnose" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4 pb-20">
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bug className="text-brand-amber w-5 h-5" />
                      Crop Health Check
                    </CardTitle>
                    <CardDescription>Tell me what's wrong with your crop.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>What are you growing?</Label>
                      <Select value={diagCrop} onValueChange={setDiagCrop}>
                        <SelectTrigger className="border-brand-green/20">
                          <SelectValue placeholder="Select crop" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Maize">Maize (Corn)</SelectItem>
                          <SelectItem value="Cassava">Cassava</SelectItem>
                          <SelectItem value="Rice">Rice</SelectItem>
                          <SelectItem value="Yam">Yam</SelectItem>
                          <SelectItem value="Cocoa">Cocoa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>What symptoms do you see?</Label>
                      <Textarea 
                        placeholder="e.g. yellow leaves, small holes, white spots..."
                        className="border-brand-green/20 min-h-[100px]"
                        value={diagSymptoms}
                        onChange={(e) => setDiagSymptoms(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                       <Button variant="outline" className="flex-1 border-brand-green/20 text-brand-green">
                        <ImageIcon className="w-4 h-4 mr-2" /> Add Photo
                      </Button>
                      <Button 
                        className="flex-1 bg-brand-green hover:bg-brand-green/90"
                        onClick={handleDiagnose}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Diagnose Now"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <AnimatePresence>
                  {diagResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className="border-brand-amber/20 bg-brand-amber/5">
                        <CardHeader className="pb-2">
                          <Badge className="w-fit mb-2 bg-brand-amber">Diagnosis Result</Badge>
                          <CardTitle className="text-brand-earth">{diagResult.disease}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                          <div>
                            <h4 className="font-bold text-brand-green flex items-center gap-1">
                              <Info className="w-3 h-3" /> Why it happens:
                            </h4>
                            <p className="opacity-80">{diagResult.cause}</p>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-brand-green/10">
                            <h4 className="font-bold text-brand-green mb-1">How to fix it:</h4>
                            <p className="font-medium">{diagResult.treatment}</p>
                          </div>
                          <div>
                            <h4 className="font-bold text-brand-green">How to prevent:</h4>
                            <p className="opacity-80">{diagResult.prevention}</p>
                          </div>
                        </CardContent>
                        <CardFooter className="border-t border-brand-green/5 pt-4 flex justify-between items-center">
                          <span className="text-xs opacity-50">Was this helpful?</span>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-brand-green/10">
                              <ThumbsUp className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10">
                              <ThumbsDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>

            {/* Planting Tab */}
            <TabsContent value="planting" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4 pb-20">
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CloudSun className="text-brand-amber w-5 h-5" />
                      Planting Advisory
                    </CardTitle>
                    <CardDescription>Get the best time to plant your crops.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Where are you located?</Label>
                      <Input 
                        placeholder="e.g. Lagos, Nigeria or Kumasi, Ghana" 
                        className="border-brand-green/20"
                        value={advLocation}
                        onChange={(e) => setAdvLocation(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Crop</Label>
                        <Select value={advCrop} onValueChange={setAdvCrop}>
                          <SelectTrigger className="border-brand-green/20">
                            <SelectValue placeholder="Crop" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Maize">Maize</SelectItem>
                            <SelectItem value="Rice">Rice</SelectItem>
                            <SelectItem value="Cassava">Cassava</SelectItem>
                            <SelectItem value="Yam">Yam</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Current Month</Label>
                        <Select value={advMonth} onValueChange={setAdvMonth}>
                          <SelectTrigger className="border-brand-green/20">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="January">January</SelectItem>
                            <SelectItem value="February">February</SelectItem>
                            <SelectItem value="March">March</SelectItem>
                            <SelectItem value="April">April</SelectItem>
                            <SelectItem value="May">May</SelectItem>
                            <SelectItem value="June">June</SelectItem>
                            <SelectItem value="July">July</SelectItem>
                            <SelectItem value="August">August</SelectItem>
                            <SelectItem value="September">September</SelectItem>
                            <SelectItem value="October">October</SelectItem>
                            <SelectItem value="November">November</SelectItem>
                            <SelectItem value="December">December</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-brand-green hover:bg-brand-green/90"
                      onClick={handleGetAdvice}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Planting Advice"}
                    </Button>
                  </CardContent>
                </Card>

                <AnimatePresence>
                  {advResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="border-brand-green/20 bg-brand-green/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-brand-green text-base">Recommended Strategy</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-brand-green/10">
                            <div className="bg-brand-green/10 p-2 rounded-lg">
                              <ChevronRight className="w-4 h-4 text-brand-green" />
                            </div>
                            <div>
                              <p className="font-bold text-brand-green">Best Time to Plant:</p>
                              <p className="text-lg font-medium">{advResult.bestTime}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-bold text-brand-green">Climate Advice:</h4>
                            <p className="opacity-80">{advResult.climateAdvice}</p>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-bold text-brand-green">Risks to Watch:</h4>
                            <div className="flex flex-wrap gap-2">
                              {advResult.risks.map((risk, i) => (
                                <Badge key={i} variant="outline" className="bg-white border-red-200 text-red-700">
                                  {risk}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Footer Navigation (Mobile Style) */}
      <footer className="bg-white border-t border-brand-green/10 p-2 flex justify-around items-center">
        <div className="text-[10px] opacity-50 font-medium">AgriBridge AI v1.0 Prototype</div>
      </footer>

      <Toaster position="top-center" />
    </div>
  );
}
