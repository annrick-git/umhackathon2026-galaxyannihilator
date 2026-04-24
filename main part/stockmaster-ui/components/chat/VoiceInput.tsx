"use client"

import { useState, useRef, useCallback } from "react"

interface VoiceInputProps {
  onTranscribe: (text: string) => void
  disabled?: boolean
}

export function VoiceInput({ onTranscribe, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [error, setError] = useState<string | null>(null)

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        await transcribeAudio(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error("Microphone error:", err)
      setError("Microphone access denied")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsProcessing(true)
    }
  }

  const transcribeAudio = async (blob: Blob) => {
    try {
      const apiKey = localStorage.getItem("zapi_key") || ""
      
      if (!apiKey) {
        onTranscribe("[Voice] Please set your API key in settings first")
        return
      }

      const formData = new FormData()
      formData.append("file", blob, "recording.webm")
      formData.append("model", "speech-2")

      const response = await fetch("https://api.ilmu.ai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error("Transcription failed")
      }

      const data = await response.json()
      const text = data.text || "[Could not understand audio]"
      onTranscribe(text)
    } catch (err) {
      console.error("Transcription error:", err)
      onTranscribe("[Voice] Using browser speech recognition instead...")
      await browserSpeechRecognition()
    }
  }

  const browserSpeechRecognition = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      onTranscribe("[Voice] Speech recognition not supported in this browser")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "en-MY"
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onTranscribe(transcript)
    }

    recognition.onerror = () => {
      onTranscribe("[Voice] Could not understand. Try again.")
    }

    recognition.start()
  }

  const handleClick = () => {
    if (disabled || isProcessing) return
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`
        p-2 rounded-lg transition-all flex items-center gap-2
        ${isRecording 
          ? "bg-red-500 text-white animate-pulse" 
          : "bg-muted hover:bg-muted/80 text-muted-foreground"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      title={isRecording ? "Stop recording" : "Hold to record voice (Manglish)"}
    >
      {isProcessing ? (
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : isRecording ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 013-3h5a3 3 0 013 3v6a3 3 0 01-3 3z" />
        </svg>
      )}
      <span className="text-xs hidden sm:inline">
        {isProcessing ? "Processing..." : isRecording ? "Stop" : "Voice"}
      </span>
    </button>
  )
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}