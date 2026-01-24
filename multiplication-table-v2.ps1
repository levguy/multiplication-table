# Install Windows Terminal from the Microsoft Store
# and run PowerShell from the Terminal in order
# to get Hebrew support.


# Create a Desktop shortcut to open the Windows Terminal
# and run the script. Right-click the desktop and choose
# New -> Shortcut. In the "Type the location of the item"
# box, enter:
# 
# "C:\Users\Nir Lev\AppData\Local\Microsoft\WindowsApps\wt.exe" powershell -File "C:\Users\Nir Lev\Documents\scripts\multiplication-table.ps1"
# 
# (replace "Nir Lev" with the actual user name)
#


#
# Now let us start the script!
#
# During the running press Ctrl+C to stop
#



# Function to reverse a string (for RTL display)

function RTL($text) {
    # Split the string into "words" (numbers, Hebrew words, punctuation)
    $tokens = $text -split ' '

    $processed = @()
    foreach ($token in $tokens) {
        if ($token -match '^\d+$') {
            # Numbers stay as-is
            $processed += $token
        } else {
            # Reverse the characters of the token
            $chars = $token.ToCharArray()
            [Array]::Reverse($chars)
            $processed += (-join $chars)
        }
    }

    # Reverse the order of all tokens
    [Array]::Reverse($processed)

    # Join tokens into a single string
    -join ($processed -join " ")
}


# Simple helper to write colored text
function Write-Color {
    param (
        [string]$Text,
        [ConsoleColor]$Color
    )
    Write-Host $Text -ForegroundColor $Color
}


# Weights for numbers 1..10 (higher = more likely)
# Index 0 -> number 1, index 1 -> number 2, ..., index 9 -> number 10
$NumberWeights = @(
    1,  # 1
    1,  # 2
    2,  # 3
    2,  # 4
    3,  # 5
    3,  # 6
    4,  # 7
    4,  # 8
    5,  # 9
    2   # 10
)



function Get-WeightedRandomNumber {
    param (
        [int[]]$Weights
    )

    $totalWeight = 0
    foreach ($w in $Weights) {
        $totalWeight += $w
    }

    $rand = Get-Random -Minimum 0 -Maximum $totalWeight

    $cumulative = 0
    for ($i = 0; $i -lt $Weights.Count; $i++) {
        $cumulative += $Weights[$i]
        if ($rand -lt $cumulative) {
            return $i + 1
        }
    }

    throw "Weighted selection failed (should never happen)."
}



function Play-CorrectSound {
    # Each melody: [frequency, duration, frequency, duration, ...]
    $melodies = @(
        # Twinkle Twinkle (first 6 notes)
        @(523, 100, 523, 100, 784, 100, 784, 100, 880, 100, 880, 100),
        
        # Mary Had a Little Lamb (first 6 notes)
        @(659, 100, 587, 100, 523, 100, 587, 100, 659, 100, 659, 100),
        
        # Happy Birthday snippet (first 6 notes)
        @(523, 100, 523, 100, 587, 100, 523, 100, 698, 100, 659, 100),
        
        # London Bridge (first 6 notes)
        @(587, 100, 523, 100, 493, 100, 523, 100, 587, 100, 587, 100),
        
        # Short ascending jingle (6 notes)
        @(523, 80, 587, 80, 659, 80, 698, 80, 784, 80, 880, 80)
    )

    # Pick one melody at random
    $melody = Get-Random -InputObject $melodies

    # Play each note
    for ($i = 0; $i -lt $melody.Length; $i += 2) {
        $freq = $melody[$i]
        $dur  = $melody[$i+1]
        [console]::beep($freq, $dur)
    }
}



function Play-WrongSound {
    # Each melody: [frequency, duration, frequency, duration, ...]
    $melodies = @(
        # Funeral March (Chopin, first 4 notes)
        @(523, 100, 466, 100, 440, 100, 392, 100),

        # Moonlight Sonata (Beethoven, first 4 notes)
        @(659, 100, 622, 100, 587, 100, 523, 100),

        # Minor descending arpeggio
        @(880, 100, 830, 100, 784, 100, 740, 100),

        # Classic game-over motif
        @(900, 90, 850, 90, 780, 90, 720, 90),

        # Hero defeat snippet
        @(950, 100, 900, 100, 850, 100, 800, 100)
    )

    # Pick a melody randomly
    $melody = Get-Random -InputObject $melodies

    # Play each note
    for ($i = 0; $i -lt $melody.Length; $i += 2) {
        $freq = $melody[$i]
        $dur  = $melody[$i+1]
        [console]::beep($freq, $dur)
    }
}




# List of positive feedback messages in Hebrew
$compliments = @(
    "נדירה!",
    "מושלמת!",
    "מהממת!",
    "גאונה!",
    "גאונה של אבא!",
    "גאונה של אמא!",
    "מטורף!",
    "כל הכבוד!",
    "את צודקת!",
    "פנטסטי!",
    "מושלם!",
    "יופי!",
    "בראבו!",
    "נפלא!",
    "נהדר!",
    "טוב מאד!",
    "נכון מאד!",
    "מעולה!",
    "תשובה נכונה!",
    "יפה מאוד!",
    "המשיכי כך!",
    "את אלופה!",
    "מצוין!"
)

# Welcome message

Write-Color (RTL "ברוכה הבאה אביגיל לתרגול המתקדם של לוח הכפל!") Magenta
Write-Color (RTL "בהצלחה!") DarkCyan
Write-Host " "


while ($true) {
    # Generate random numbers between 1 and 10
    $A = Get-WeightedRandomNumber -Weights $NumberWeights
    $B = Get-WeightedRandomNumber -Weights $NumberWeights
    $correctAnswer = $A * $B

    $answeredCorrectly = $false

    while (-not $answeredCorrectly) {
        # Display the multiplication question in RTL
        $question = "כמה זה $A * $B ?"
        Write-Color (RTL $question) Cyan
        $input = Read-Host " "


        if ($input -as [int] -ne $null) {
            if ([int]$input -eq $correctAnswer) {
                Play-CorrectSound
                $compliment = Get-Random -InputObject $compliments
                Write-Color (RTL $compliment) Green
                Write-Host ""
                $answeredCorrectly = $true
            } else {
                Play-WrongSound
                Write-Color (RTL "לא נכון, נסי שוב.") Red
            }
        } else {
            Play-WrongSound
            Write-Color (RTL "נא להקליד מספר.") Yellow
        }


    }
}

