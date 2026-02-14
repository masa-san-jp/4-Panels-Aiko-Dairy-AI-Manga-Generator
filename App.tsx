import React, { useState, useEffect } from 'react';
// import { Header } from './components/Header';
// import { Button } from './components/Button';
// import { FileUpload } from './components/FileUpload';
import { ApiKeyModal } from './components/ApiKeyModal';
import { GeneratedImage, AppMode } from './types';
import { generateComic, editImage } from './services/geminiService';
import { Wand2, Download, AlertCircle, ImagePlus, ChevronRight, LayoutTemplate, Palette } from 'lucide-react';

const DEFAULT_INSTRUCTION = `私は、プロフェッショナルの漫画制作スタジオの作画監督です。
添付したキャラクターデザインシートとレイアウトに忠実に従って4コマ漫画を制作し、画像を出力してください。
画像のサイズは、縦1920px、横1410pxです。サイズは厳密に守ってください。

# 指示書

## レイアウト
- 添付したレイアウトリファレンスに従って、枠線と吹き出しを、はっきりくっきりした黒い線で再現してください
- 赤字のAikoはキャラクターの配置の指示です。各コマの指示の内容に従ってください
- 青字のObject はAiko以外の要素の指示です。各コマの指示に従ってください
- 吹き出しには後で文字を入れるので、空白にしておいてください
- 漫画的な記号は描いてもよいですが、各コマの指示で明示的に指示された以外の文字は書かないでください

## トーン&マナー
- 添付したキャラクターデザインシートのデザインマナーに従って調和の取れたトーン&マナーにしてください
- カラーリングはフラットカラーで、均一に美しく塗ってください
- Aiko以外のキャラクター、Objectの内容、背景などは、副題なので、線を若干細く、色も少しおとなしくして、Aikoが目立つようにしてください
- 特に背景描写の指示がない時は、前後の文脈を解釈して色を塗ったり、抽象的な背景を適当に描いてください

## 各コマの指示
- 「シーン」「Aiko」「Object」は指示なので、文字として出力しないでください。`;

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.GENERATE);
  
  // Generation State
  const [prompt, setPrompt] = useState(DEFAULT_INSTRUCTION);
  const [charSheet, setCharSheet] = useState<File | null>(null);
  const [layoutRef, setLayoutRef] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit State
  const [editInstruction, setEditInstruction] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const selectedImage = generatedImages.find(img => img.id === selectedImageId);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateComic(prompt, charSheet, layoutRef, "4:3"); // 4:3 is closest to 1920x1410 (approx 1.36 vs 1.33)
      setGeneratedImages(prev => [result, ...prev]);
      setSelectedImageId(result.id);
      setMode(AppMode.EDIT); // Switch to view/edit mode automatically
    } catch (err: any) {
      const msg = err.message || "Failed to generate image";
      setError(msg);
      // Auto open settings if key is missing
      if (msg.includes("API Key")) {
        setIsSettingsOpen(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedImage || !editInstruction) return;
    setIsEditing(true);
    setError(null);
    try {
      const result = await editImage(selectedImage.data, selectedImage.mimeType, editInstruction);
      setGeneratedImages(prev => [result, ...prev]);
      setSelectedImageId(result.id);
      setEditInstruction("");
    } catch (err: any) {
      const msg = err.message || "Failed to edit image";
      setError(msg);
      if (msg.includes("API Key")) {
        setIsSettingsOpen(true);
      }
    } finally {
      setIsEditing(false);
    }
  };

  const handleDownload = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = `data:${img.mimeType};base64,${img.data}`;
    link.download = `comic_aiko_${img.id.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Scroll to new image
  useEffect(() => {
    if (selectedImageId) {
       const el = document.getElementById(`img-${selectedImageId}`);
       if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedImageId]);

  return (
    <div className="flex flex-col h-screen bg-black text-zinc-100 font-sans">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      
      <ApiKeyModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Controls */}
        <div className="w-80 md:w-96 flex-shrink-0 border-r border-zinc-800 bg-zinc-900/30 flex flex-col h-full overflow-y-auto">
          
          <div className="p-4 space-y-4">
             {/* Mode Toggle */}
             <div className="bg-zinc-800/50 p-1 rounded-lg flex text-sm">
                <button 
                  onClick={() => setMode(AppMode.GENERATE)}
                  className={`flex-1 py-1.5 px-3 rounded-md transition-all ${mode === AppMode.GENERATE ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Create
                </button>
                <button 
                   onClick={() => setMode(AppMode.EDIT)}
                   className={`flex-1 py-1.5 px-3 rounded-md transition-all ${mode === AppMode.EDIT ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Edit & Refine
                </button>
             </div>

             {mode === AppMode.GENERATE ? (
               <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-indigo-400" />
                      Reference Material
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                      <FileUpload label="Character Sheet" onFileSelect={setCharSheet} />
                      <FileUpload label="Layout Reference" onFileSelect={setLayoutRef} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                       <Palette className="w-4 h-4 text-purple-400" />
                       Production Prompt
                    </h2>
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full h-64 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-mono leading-relaxed"
                      placeholder="Enter specific comic instructions..."
                    />
                  </div>

                  <Button 
                    className="w-full h-12 text-base shadow-indigo-500/20" 
                    onClick={handleGenerate} 
                    isLoading={isGenerating}
                  >
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate Comic
                  </Button>
               </div>
             ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                   <div className="space-y-3">
                      <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                        <ImagePlus className="w-4 h-4 text-emerald-400" />
                        Edit Selection
                      </h2>
                      {selectedImage ? (
                         <div className="relative rounded-lg overflow-hidden border border-zinc-700 aspect-[4/3]">
                            <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} alt="Selected" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10" />
                         </div>
                      ) : (
                        <div className="h-40 rounded-lg border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 p-4 text-center">
                           <p className="text-sm">Select an image from the canvas on the right to edit.</p>
                        </div>
                      )}
                   </div>

                   <div className="space-y-3">
                      <h2 className="text-sm font-semibold text-zinc-200">Refinement Instruction</h2>
                      <textarea 
                        value={editInstruction}
                        onChange={(e) => setEditInstruction(e.target.value)}
                        className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none placeholder:text-zinc-600"
                        placeholder="e.g. 'Make the sky blue', 'Fix Aiko's hair color', 'Add a cat in panel 3'"
                        disabled={!selectedImage}
                      />
                   </div>

                   <Button 
                     className="w-full" 
                     variant="secondary"
                     onClick={handleEdit} 
                     isLoading={isEditing}
                     disabled={!selectedImage || !editInstruction}
                   >
                     <Wand2 className="w-4 h-4 mr-2" />
                     Apply Edits
                   </Button>
                </div>
             )}

             {error && (
               <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-xs text-red-400">
                 <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                 <p>{error}</p>
                 {error.includes("API Key") && (
                     <button onClick={() => setIsSettingsOpen(true)} className="underline ml-1 hover:text-red-300">Set Key</button>
                 )}
               </div>
             )}
          </div>
        </div>

        {/* Center: Canvas / Gallery */}
        <div className="flex-1 bg-zinc-950/50 flex flex-col relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
           
           <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth" id="canvas-area">
              {generatedImages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                   <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      <LayoutTemplate className="w-10 h-10 opacity-50" />
                   </div>
                   <div className="text-center">
                      <h3 className="text-lg font-medium text-zinc-400">Ready to create</h3>
                      <p className="text-sm max-w-sm mt-2">Upload your layout and character sheet to begin generating your comic strip.</p>
                   </div>
                </div>
              ) : (
                generatedImages.map((img) => (
                  <div 
                    key={img.id} 
                    id={`img-${img.id}`}
                    className={`group relative max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${selectedImageId === img.id ? 'ring-2 ring-indigo-500 scale-[1.01]' : 'ring-1 ring-zinc-800 hover:ring-zinc-600'}`}
                    onClick={() => {
                      setSelectedImageId(img.id);
                      if (mode === AppMode.GENERATE) setMode(AppMode.EDIT);
                    }}
                  >
                    <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="bg-black/70 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10">
                         {new Date(img.timestamp).toLocaleTimeString()}
                       </span>
                    </div>
                    
                    <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleDownload(img); }}
                         className="p-2 bg-black/70 hover:bg-black backdrop-blur rounded-lg text-white border border-white/10 transition-colors"
                         title="Download"
                       >
                         <Download className="w-4 h-4" />
                       </button>
                    </div>

                    <img 
                      src={`data:${img.mimeType};base64,${img.data}`} 
                      alt="Generated Comic" 
                      className="w-full h-auto block bg-white" 
                    />
                    
                    {selectedImageId === img.id && (
                       <div className="absolute bottom-0 inset-x-0 h-1 bg-indigo-500"></div>
                    )}
                  </div>
                ))
              )}
           </div>

           {/* Quick Tip Footer */}
           <div className="h-10 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center text-xs text-zinc-500 gap-2">
              <span className="font-medium text-indigo-400">Tip:</span>
              Use specific instructions like "Remove the background in panel 2" in Edit mode for best results.
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;