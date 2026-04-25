"use client"

import React, { useState, useEffect, useRef } from "react"
import { Mic, Square, Loader2 } from "lucide-react"

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check if browser supports Web Speech API
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = false
        // Optional: you can set lang to "en-MY" or "ms-MY" here to better support Manglish
        recognitionRef.current.lang = "en-MY"

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((result: any) => result[0].transcript)
            .join("")
          
          if (transcript) {
            onTranscript(transcript)
          }
        }

        recognitionRef.current.onerror = (event: Event) => {
          console.error("Speech recognition error", event)
          setIsRecording(false)
        }

        recognitionRef.current.onend = () => {
          setIsRecording(false)
        }
      } else {
        setIsSupported(false)
      }
    }
  }, [onTranscript])

  const toggleRecording = () => {
    if (!isSupported) {
      alert("Voice recognition is not supported in this browser.")
      return
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      try {
        recognitionRef.current?.start()
        setIsRecording(true)
      } catch (e) {
        console.error("Failed to start recording:", e)
      }
    }
  }

  if (!isSupported) return null

  return (
    <button
      type="button"
      onClick={toggleRecording}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
        isRecording 
          ? "bg-red-500/10 text-red-500 animate-pulse" 
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
      }`}
      title={isRecording ? "Stop recording" : "Record voice note"}
    >
      {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  )
}