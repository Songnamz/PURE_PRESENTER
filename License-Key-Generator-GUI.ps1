# License Key Generator - Windows GUI
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# IMPORTANT: This key must match the one in app/license.js
$ENCRYPTION_KEY = 'AIU-CHURCH-PRESENTER-2025-SECRET-KEY-CHANGE-THIS-32CHARS!!'

# Function to generate MD5 hash
function Generate-Hash($customer, $expiry) {
    $data = "$customer-$expiry-$ENCRYPTION_KEY"
    $md5 = [System.Security.Cryptography.MD5]::Create()
    $hash = $md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($data))
    $fullHash = [System.BitConverter]::ToString($hash).Replace("-", "")
    # Return only first 16 characters (like Node.js .substring(0, 16))
    return $fullHash.Substring(0, 16).ToUpper()
}

# Function to validate customer ID
function Validate-CustomerID($customerId) {
    if ($customerId -match '^[A-Z0-9]{5,20}$') {
        return $true
    }
    return $false
}

# Function to validate date
function Validate-Date($dateString) {
    try {
        $date = [DateTime]::ParseExact($dateString, "yyyyMMdd", $null)
        if ($date -gt (Get-Date)) {
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

# Function to generate license key
function Generate-LicenseKey($customer, $expiry) {
    $hash = Generate-Hash $customer $expiry
    return "$customer-$expiry-$hash"
}

# Create the form
$form = New-Object System.Windows.Forms.Form
$form.Text = "License Key Generator"
$form.Size = New-Object System.Drawing.Size(700, 600)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::White

# Title Label
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "PURE PRESENTER - License Generator"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$titleLabel.Location = New-Object System.Drawing.Point(20, 20)
$titleLabel.Size = New-Object System.Drawing.Size(660, 35)
$titleLabel.TextAlign = "MiddleCenter"
$titleLabel.ForeColor = [System.Drawing.Color]::FromArgb(102, 126, 234)
$form.Controls.Add($titleLabel)

# Customer ID Label
$customerLabel = New-Object System.Windows.Forms.Label
$customerLabel.Text = "Customer ID (5-20 alphanumeric characters):"
$customerLabel.Location = New-Object System.Drawing.Point(20, 70)
$customerLabel.Size = New-Object System.Drawing.Size(660, 20)
$form.Controls.Add($customerLabel)

# Customer ID TextBox
$customerTextBox = New-Object System.Windows.Forms.TextBox
$customerTextBox.Location = New-Object System.Drawing.Point(20, 95)
$customerTextBox.Size = New-Object System.Drawing.Size(660, 25)
$customerTextBox.Font = New-Object System.Drawing.Font("Segoe UI", 11)
$customerTextBox.CharacterCasing = "Upper"
$form.Controls.Add($customerTextBox)

# Expiry Date Label
$expiryLabel = New-Object System.Windows.Forms.Label
$expiryLabel.Text = "Expiry Date (YYYYMMDD format):"
$expiryLabel.Location = New-Object System.Drawing.Point(20, 135)
$expiryLabel.Size = New-Object System.Drawing.Size(300, 20)
$form.Controls.Add($expiryLabel)

# Expiry Date TextBox
$expiryTextBox = New-Object System.Windows.Forms.TextBox
$expiryTextBox.Location = New-Object System.Drawing.Point(20, 160)
$expiryTextBox.Size = New-Object System.Drawing.Size(200, 25)
$expiryTextBox.Font = New-Object System.Drawing.Font("Segoe UI", 11)
$expiryTextBox.MaxLength = 8
$form.Controls.Add($expiryTextBox)

# Quick Date Buttons Panel
$datePanel = New-Object System.Windows.Forms.Panel
$datePanel.Location = New-Object System.Drawing.Point(230, 160)
$datePanel.Size = New-Object System.Drawing.Size(450, 30)
$form.Controls.Add($datePanel)

# 1 Year Button
$oneYearButton = New-Object System.Windows.Forms.Button
$oneYearButton.Text = "+1 Year"
$oneYearButton.Location = New-Object System.Drawing.Point(0, 0)
$oneYearButton.Size = New-Object System.Drawing.Size(80, 30)
$oneYearButton.BackColor = [System.Drawing.Color]::LightGreen
$datePanel.Controls.Add($oneYearButton)

$oneYearButton.Add_Click({
    $date = (Get-Date).AddYears(1).ToString("yyyyMMdd")
    $expiryTextBox.Text = $date
})

# 3 Years Button
$threeYearsButton = New-Object System.Windows.Forms.Button
$threeYearsButton.Text = "+3 Years"
$threeYearsButton.Location = New-Object System.Drawing.Point(90, 0)
$threeYearsButton.Size = New-Object System.Drawing.Size(80, 30)
$threeYearsButton.BackColor = [System.Drawing.Color]::LightBlue
$datePanel.Controls.Add($threeYearsButton)

$threeYearsButton.Add_Click({
    $date = (Get-Date).AddYears(3).ToString("yyyyMMdd")
    $expiryTextBox.Text = $date
})

# 5 Years Button
$fiveYearsButton = New-Object System.Windows.Forms.Button
$fiveYearsButton.Text = "+5 Years"
$fiveYearsButton.Location = New-Object System.Drawing.Point(180, 0)
$fiveYearsButton.Size = New-Object System.Drawing.Size(80, 30)
$fiveYearsButton.BackColor = [System.Drawing.Color]::LightCoral
$datePanel.Controls.Add($fiveYearsButton)

$fiveYearsButton.Add_Click({
    $date = (Get-Date).AddYears(5).ToString("yyyyMMdd")
    $expiryTextBox.Text = $date
})

# Lifetime Button
$lifetimeButton = New-Object System.Windows.Forms.Button
$lifetimeButton.Text = "Lifetime (2099)"
$lifetimeButton.Location = New-Object System.Drawing.Point(270, 0)
$lifetimeButton.Size = New-Object System.Drawing.Size(120, 30)
$lifetimeButton.BackColor = [System.Drawing.Color]::Gold
$datePanel.Controls.Add($lifetimeButton)

$lifetimeButton.Add_Click({
    $expiryTextBox.Text = "20991231"
})

# Generate Button
$generateButton = New-Object System.Windows.Forms.Button
$generateButton.Text = "Generate License Key"
$generateButton.Location = New-Object System.Drawing.Point(20, 210)
$generateButton.Size = New-Object System.Drawing.Size(200, 45)
$generateButton.BackColor = [System.Drawing.Color]::FromArgb(102, 126, 234)
$generateButton.ForeColor = [System.Drawing.Color]::White
$generateButton.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($generateButton)

# Clear Button
$clearButton = New-Object System.Windows.Forms.Button
$clearButton.Text = "Clear"
$clearButton.Location = New-Object System.Drawing.Point(230, 210)
$clearButton.Size = New-Object System.Drawing.Size(100, 45)
$clearButton.BackColor = [System.Drawing.Color]::LightGray
$form.Controls.Add($clearButton)

# Close Button
$closeButton = New-Object System.Windows.Forms.Button
$closeButton.Text = "Close"
$closeButton.Location = New-Object System.Drawing.Point(340, 210)
$closeButton.Size = New-Object System.Drawing.Size(100, 45)
$closeButton.BackColor = [System.Drawing.Color]::LightGray
$form.Controls.Add($closeButton)

# Result Label
$resultLabel = New-Object System.Windows.Forms.Label
$resultLabel.Text = "Generated License Key:"
$resultLabel.Location = New-Object System.Drawing.Point(20, 275)
$resultLabel.Size = New-Object System.Drawing.Size(660, 20)
$resultLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($resultLabel)

# License Key TextBox (Result)
$licenseKeyTextBox = New-Object System.Windows.Forms.TextBox
$licenseKeyTextBox.Location = New-Object System.Drawing.Point(20, 300)
$licenseKeyTextBox.Size = New-Object System.Drawing.Size(560, 30)
$licenseKeyTextBox.Font = New-Object System.Drawing.Font("Courier New", 12, [System.Drawing.FontStyle]::Bold)
$licenseKeyTextBox.ReadOnly = $true
$licenseKeyTextBox.BackColor = [System.Drawing.Color]::FromArgb(240, 240, 240)
$licenseKeyTextBox.TextAlign = "Center"
$form.Controls.Add($licenseKeyTextBox)

# Copy Button
$copyButton = New-Object System.Windows.Forms.Button
$copyButton.Text = "Copy"
$copyButton.Location = New-Object System.Drawing.Point(590, 300)
$copyButton.Size = New-Object System.Drawing.Size(90, 30)
$copyButton.BackColor = [System.Drawing.Color]::LightSeaGreen
$copyButton.ForeColor = [System.Drawing.Color]::White
$copyButton.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($copyButton)

# Status TextBox
$statusTextBox = New-Object System.Windows.Forms.TextBox
$statusTextBox.Location = New-Object System.Drawing.Point(20, 350)
$statusTextBox.Size = New-Object System.Drawing.Size(660, 200)
$statusTextBox.Multiline = $true
$statusTextBox.ScrollBars = "Vertical"
$statusTextBox.ReadOnly = $true
$statusTextBox.Font = New-Object System.Drawing.Font("Courier New", 9)
$statusTextBox.BorderStyle = "FixedSingle"
$form.Controls.Add($statusTextBox)

# Generate Button Click Handler
$generateButton.Add_Click({
    $customerId = $customerTextBox.Text.Trim()
    $expiryDate = $expiryTextBox.Text.Trim()
    
    # Clear previous results
    $licenseKeyTextBox.Text = ""
    $statusTextBox.ForeColor = [System.Drawing.Color]::Black
    
    # Validate Customer ID
    if ([string]::IsNullOrWhiteSpace($customerId)) {
        $statusTextBox.Text = "[ERROR] Customer ID is required."
        $statusTextBox.ForeColor = [System.Drawing.Color]::Red
        return
    }
    
    if (-not (Validate-CustomerID $customerId)) {
        $statusTextBox.Text = "[ERROR] Invalid Customer ID.`r`n`r`nRequirements:`r`n- Must be 5-20 characters`r`n- Only letters and numbers (A-Z, 0-9)`r`n- No spaces or special characters`r`n`r`nExamples:`r`n- AIUCHURCH`r`n- CHURCH123`r`n- CUSTOMER01"
        $statusTextBox.ForeColor = [System.Drawing.Color]::Red
        return
    }
    
    # Validate Expiry Date
    if ([string]::IsNullOrWhiteSpace($expiryDate)) {
        $statusTextBox.Text = "[ERROR] Expiry date is required.`r`n`r`nUse the quick buttons or enter manually in YYYYMMDD format."
        $statusTextBox.ForeColor = [System.Drawing.Color]::Red
        return
    }
    
    if ($expiryDate.Length -ne 8 -or $expiryDate -notmatch '^\d{8}$') {
        $statusTextBox.Text = "[ERROR] Invalid date format.`r`n`r`nExpected format: YYYYMMDD`r`nExample: 20261019`r`n`r`nOr use the quick date buttons above."
        $statusTextBox.ForeColor = [System.Drawing.Color]::Red
        return
    }
    
    if (-not (Validate-Date $expiryDate)) {
        $statusTextBox.Text = "[ERROR] Invalid expiry date.`r`n`r`nThe date must be:`r`n- A valid calendar date`r`n- In the future`r`n`r`nPlease check the date and try again."
        $statusTextBox.ForeColor = [System.Drawing.Color]::Red
        return
    }
    
    try {
        # Generate license key
        $licenseKey = Generate-LicenseKey $customerId $expiryDate
        $licenseKeyTextBox.Text = $licenseKey
        
        # Format expiry date for display
        $displayDate = [DateTime]::ParseExact($expiryDate, "yyyyMMdd", $null).ToString("MMMM dd, yyyy")
        
        # Calculate days until expiry
        $expiryDateTime = [DateTime]::ParseExact($expiryDate, "yyyyMMdd", $null)
        $daysUntilExpiry = ($expiryDateTime - (Get-Date)).Days
        
        $statusTextBox.Text = "[SUCCESS] License key generated successfully!`r`n`r`n" +
                             "============================================`r`n" +
                             "LICENSE KEY DETAILS`r`n" +
                             "============================================`r`n`r`n" +
                             "License Key:`r`n  $licenseKey`r`n`r`n" +
                             "Customer ID:`r`n  $customerId`r`n`r`n" +
                             "Expiry Date:`r`n  $displayDate`r`n  ($daysUntilExpiry days from today)`r`n`r`n" +
                             "============================================`r`n`r`n" +
                             "INSTRUCTIONS:`r`n" +
                             "1. Click 'Copy' button to copy the license key`r`n" +
                             "2. Send the license key to the customer`r`n" +
                             "3. Customer enters this key in the activation dialog`r`n`r`n" +
                             "NOTE: Keep this license key secure and private."
        $statusTextBox.ForeColor = [System.Drawing.Color]::DarkGreen
    }
    catch {
        $statusTextBox.Text = "[ERROR] Failed to generate license key:`r`n$($_.Exception.Message)"
        $statusTextBox.ForeColor = [System.Drawing.Color]::Red
    }
})

# Copy Button Click Handler
$copyButton.Add_Click({
    if (-not [string]::IsNullOrWhiteSpace($licenseKeyTextBox.Text)) {
        [System.Windows.Forms.Clipboard]::SetText($licenseKeyTextBox.Text)
        $originalText = $statusTextBox.Text
        $statusTextBox.Text = "[INFO] License key copied to clipboard!`r`n`r`n" + $originalText
        $statusTextBox.ForeColor = [System.Drawing.Color]::Blue
    }
})

# Clear Button Click Handler
$clearButton.Add_Click({
    $customerTextBox.Text = ""
    $expiryTextBox.Text = ""
    $licenseKeyTextBox.Text = ""
    $statusTextBox.Text = ""
})

# Close Button Click Handler
$closeButton.Add_Click({
    $form.Close()
})

# Show the form
[void]$form.ShowDialog()
