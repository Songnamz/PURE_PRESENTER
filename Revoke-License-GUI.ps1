# License Revocation Tool - Windows GUI
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Function to load blacklist
function Load-Blacklist {
    $blacklistPath = "license-blacklist.json"
    if (Test-Path $blacklistPath) {
        return Get-Content $blacklistPath -Raw | ConvertFrom-Json
    }
    return @{
        revokedKeys = @()
        revokedCustomers = @()
        lastUpdated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
}

# Function to save blacklist
function Save-Blacklist($blacklist) {
    $blacklist.lastUpdated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $json = $blacklist | ConvertTo-Json -Depth 10
    
    # Save to root directory
    $json | Set-Content "license-blacklist.json" -Encoding UTF8
    
    # Save to app directory
    $appPath = "app\license-blacklist.json"
    $json | Set-Content $appPath -Encoding UTF8
}

# Function to validate license key format
function Validate-LicenseKey($key) {
    if ($key -match '^[A-Z0-9]+-\d{8}-[A-F0-9]{16}$') {
        return $true
    }
    return $false
}

# Function to convert UTC to Bangkok time (UTC+7)
function Convert-ToBangkokTime($utcDateString) {
    try {
        $utcDate = [DateTime]::Parse($utcDateString)
        $bangkokTime = $utcDate.AddHours(7)
        return $bangkokTime.ToString("MMMM dd, yyyy HH:mm:ss") + " (Bangkok Time)"
    }
    catch {
        return $utcDateString
    }
}

# Function to get activated license from this device
function Get-ActivatedLicense {
    try {
        # Use Node.js helper script to decrypt license (uses same scrypt method as app)
        $scriptPath = Join-Path $PSScriptRoot "get-activated-license.js"
        
        if (-not (Test-Path $scriptPath)) {
            return $null
        }
        
        # Run Node.js script and capture JSON output
        $output = node $scriptPath 2>&1 | Out-String
        
        if ([string]::IsNullOrWhiteSpace($output)) {
            return $null
        }
        
        # Parse JSON result
        $result = $output | ConvertFrom-Json
        
        if ($result.error) {
            return $null
        }
        
        if ($result.success) {
            return @{
                key = $result.key
                customer = $result.customer
                activated = $result.activated
            }
        }
        
        return $null
    }
    catch {
        return $null
    }
}

# Create the form
$form = New-Object System.Windows.Forms.Form
$form.Text = "License Revocation Tool"
$form.Size = New-Object System.Drawing.Size(600, 480)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

# Title Label
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "License Revocation Tool"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$titleLabel.Location = New-Object System.Drawing.Point(20, 20)
$titleLabel.Size = New-Object System.Drawing.Size(560, 35)
$titleLabel.TextAlign = "MiddleCenter"
$form.Controls.Add($titleLabel)

# License Key Label
$keyLabel = New-Object System.Windows.Forms.Label
$keyLabel.Text = "License Key:"
$keyLabel.Location = New-Object System.Drawing.Point(20, 70)
$keyLabel.Size = New-Object System.Drawing.Size(560, 20)
$form.Controls.Add($keyLabel)

# License Key TextBox
$keyTextBox = New-Object System.Windows.Forms.TextBox
$keyTextBox.Location = New-Object System.Drawing.Point(20, 95)
$keyTextBox.Size = New-Object System.Drawing.Size(390, 25)
$keyTextBox.Font = New-Object System.Drawing.Font("Courier New", 10)
$keyTextBox.CharacterCasing = "Upper"
$form.Controls.Add($keyTextBox)

# Detect This Device Button
$detectButton = New-Object System.Windows.Forms.Button
$detectButton.Text = "Detect This Device"
$detectButton.Location = New-Object System.Drawing.Point(420, 95)
$detectButton.Size = New-Object System.Drawing.Size(160, 25)
$detectButton.BackColor = [System.Drawing.Color]::MediumSeaGreen
$detectButton.ForeColor = [System.Drawing.Color]::White
$detectButton.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($detectButton)

# Reason Label
$reasonLabel = New-Object System.Windows.Forms.Label
$reasonLabel.Text = "Reason (optional):"
$reasonLabel.Location = New-Object System.Drawing.Point(20, 130)
$reasonLabel.Size = New-Object System.Drawing.Size(560, 20)
$form.Controls.Add($reasonLabel)

# Reason TextBox
$reasonTextBox = New-Object System.Windows.Forms.TextBox
$reasonTextBox.Location = New-Object System.Drawing.Point(20, 155)
$reasonTextBox.Size = New-Object System.Drawing.Size(560, 25)
$reasonTextBox.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.Controls.Add($reasonTextBox)

# Delete Local License CheckBox
$deleteLocalCheckBox = New-Object System.Windows.Forms.CheckBox
$deleteLocalCheckBox.Text = "Also delete license file from THIS device"
$deleteLocalCheckBox.Location = New-Object System.Drawing.Point(20, 185)
$deleteLocalCheckBox.Size = New-Object System.Drawing.Size(400, 20)
$deleteLocalCheckBox.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$deleteLocalCheckBox.ForeColor = [System.Drawing.Color]::DarkRed
$deleteLocalCheckBox.Checked = $false
$form.Controls.Add($deleteLocalCheckBox)

# Revoke Button
$revokeButton = New-Object System.Windows.Forms.Button
$revokeButton.Text = "Revoke License"
$revokeButton.Location = New-Object System.Drawing.Point(20, 215)
$revokeButton.Size = New-Object System.Drawing.Size(150, 40)
$revokeButton.BackColor = [System.Drawing.Color]::Crimson
$revokeButton.ForeColor = [System.Drawing.Color]::White
$revokeButton.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($revokeButton)

# List Button
$listButton = New-Object System.Windows.Forms.Button
$listButton.Text = "List Revoked"
$listButton.Location = New-Object System.Drawing.Point(180, 215)
$listButton.Size = New-Object System.Drawing.Size(150, 40)
$listButton.BackColor = [System.Drawing.Color]::SteelBlue
$listButton.ForeColor = [System.Drawing.Color]::White
$listButton.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($listButton)

# Clear Button
$clearButton = New-Object System.Windows.Forms.Button
$clearButton.Text = "Clear Form"
$clearButton.Location = New-Object System.Drawing.Point(340, 215)
$clearButton.Size = New-Object System.Drawing.Size(110, 40)
$form.Controls.Add($clearButton)

# Close Button
$closeButton = New-Object System.Windows.Forms.Button
$closeButton.Text = "Close"
$closeButton.Location = New-Object System.Drawing.Point(460, 215)
$closeButton.Size = New-Object System.Drawing.Size(120, 40)
$form.Controls.Add($closeButton)

# Status Label
$statusLabel = New-Object System.Windows.Forms.TextBox
$statusLabel.Location = New-Object System.Drawing.Point(20, 270)
$statusLabel.Size = New-Object System.Drawing.Size(560, 150)
$statusLabel.Multiline = $true
$statusLabel.ScrollBars = "Vertical"
$statusLabel.ReadOnly = $true
$statusLabel.Font = New-Object System.Drawing.Font("Courier New", 9)
$statusLabel.BorderStyle = "FixedSingle"
$form.Controls.Add($statusLabel)

# Detect This Device Button Click Handler
$detectButton.Add_Click({
    try {
        $activatedLicense = Get-ActivatedLicense
        
        if ($null -eq $activatedLicense) {
            $statusLabel.Text = "[INFO] No activated license found on this device.`r`n`r`nThis device does not have an active license installed.`r`n`r`nLocation checked:`r`n$env:LOCALAPPDATA\AIU-CHURCH-PRESENTER\license.dat"
            $statusLabel.ForeColor = [System.Drawing.Color]::Gray
            return
        }
        
        # Fill in the license key
        $keyTextBox.Text = $activatedLicense.key
        
        # Show info in status
        $activatedDate = "Unknown"
        if ($activatedLicense.activated -and $activatedLicense.activated -ne "Unknown") {
            try {
                $parsedDate = [DateTime]::Parse($activatedLicense.activated)
                $activatedDate = $parsedDate.ToString("MMMM dd, yyyy HH:mm:ss") + " (Bangkok Time)"
            }
            catch {
                $activatedDate = $activatedLicense.activated
            }
        }
        
        $customerInfo = if ($activatedLicense.customer -and $activatedLicense.customer -ne "Not specified") { 
            $activatedLicense.customer 
        } else { 
            "Not specified" 
        }
        
        $statusLabel.Text = "[SUCCESS] License detected on this device!`r`n`r`n" +
                           "License Key:`r`n  $($activatedLicense.key)`r`n`r`n" +
                           "Customer Info:`r`n  $customerInfo`r`n`r`n" +
                           "Activated On:`r`n  $activatedDate`r`n`r`n" +
                           "The license key has been automatically filled in above.`r`n" +
                           "You can now add a reason and click 'Revoke License' if needed."
        $statusLabel.ForeColor = [System.Drawing.Color]::Blue
    }
    catch {
        $statusLabel.Text = "[ERROR] Failed to detect license:`r`n$($_.Exception.Message)`r`n`r`nStack Trace:`r`n$($_.Exception.StackTrace)"
        $statusLabel.ForeColor = [System.Drawing.Color]::Red
    }
})

# Revoke Button Click Handler
$revokeButton.Add_Click({
    $licenseKey = $keyTextBox.Text.Trim()
    
    if ([string]::IsNullOrWhiteSpace($licenseKey)) {
        $statusLabel.Text = "[ERROR] Please enter a license key."
        $statusLabel.ForeColor = [System.Drawing.Color]::Red
        return
    }
    
    if (-not (Validate-LicenseKey $licenseKey)) {
        $statusLabel.Text = "[ERROR] Invalid license key format.`r`nExpected format: CUSTOMER-YYYYMMDD-HASH16`r`nExample: AIUCHURCH-20261019-8CF88E6A5484F8C2"
        $statusLabel.ForeColor = [System.Drawing.Color]::Red
        return
    }
    
    # Confirm revocation
    $result = [System.Windows.Forms.MessageBox]::Show(
        "Are you sure you want to revoke this license?`n`nLicense: $licenseKey`n`nThis action cannot be undone automatically.",
        "Confirm Revocation",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Warning
    )
    
    if ($result -eq [System.Windows.Forms.DialogResult]::No) {
        $statusLabel.Text = "[INFO] Revocation cancelled by user."
        $statusLabel.ForeColor = [System.Drawing.Color]::Gray
        return
    }
    
    try {
        $blacklist = Load-Blacklist
        
        # Check if already revoked
        $existing = $blacklist.revokedKeys | Where-Object { $_.key -eq $licenseKey }
        if ($existing) {
            $bangkokTime = Convert-ToBangkokTime $existing.revokedDate
            $statusLabel.Text = "[WARNING] This license key is already revoked.`r`n`r`nRevoked on: $bangkokTime"
            $statusLabel.ForeColor = [System.Drawing.Color]::Orange
            return
        }
        
        # Extract customer ID
        $parts = $licenseKey -split '-'
        $customerId = $parts[0]
        
        # Get reason
        $reason = $reasonTextBox.Text.Trim()
        if ([string]::IsNullOrWhiteSpace($reason)) {
            $reason = "License revoked by administrator"
        }
        
        # Add to blacklist
        $revokedEntry = @{
            key = $licenseKey
            customer = $customerId
            reason = $reason
            revokedDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        
        $blacklist.revokedKeys += $revokedEntry
        
        # Save blacklist
        Save-Blacklist $blacklist
        
        $successMessage = "[SUCCESS] License key revoked successfully!`r`n`r`nKey: $licenseKey`r`nCustomer: $customerId`r`nReason: $reason`r`n`r`nBlacklist updated in:`r`n- license-blacklist.json`r`n- app\license-blacklist.json"
        
        # Check if user wants to delete local license file
        if ($deleteLocalCheckBox.Checked) {
            try {
                $scriptPath = Join-Path $PSScriptRoot "delete-local-license.js"
                if (Test-Path $scriptPath) {
                    $deleteResult = node $scriptPath 2>&1 | Out-String | ConvertFrom-Json
                    if ($deleteResult.success) {
                        $successMessage += "`r`n`r`n[INFO] Local license file deleted from this device."
                        $successMessage += "`r`nThe application will require activation on next launch."
                    } else {
                        $successMessage += "`r`n`r`n[WARNING] Could not delete local license file: $($deleteResult.message)"
                    }
                }
            }
            catch {
                $successMessage += "`r`n`r`n[WARNING] Failed to delete local license file: $($_.Exception.Message)"
            }
        }
        
        $statusLabel.Text = $successMessage
        $statusLabel.ForeColor = [System.Drawing.Color]::Green
        
        # Clear form
        $keyTextBox.Text = ""
        $reasonTextBox.Text = ""
        $deleteLocalCheckBox.Checked = $false
    }
    catch {
        $statusLabel.Text = "[ERROR] Failed to revoke license:`r`n$($_.Exception.Message)"
        $statusLabel.ForeColor = [System.Drawing.Color]::Red
    }
})

# List Button Click Handler
$listButton.Add_Click({
    try {
        $blacklist = Load-Blacklist
        
        if ($blacklist.revokedKeys.Count -eq 0 -and $blacklist.revokedCustomers.Count -eq 0) {
            $statusLabel.Text = "[INFO] No revoked licenses found."
            $statusLabel.ForeColor = [System.Drawing.Color]::Gray
            return
        }
        
        $output = "[INFO] REVOKED LICENSES`r`n" + ("=" * 60) + "`r`n`r`n"
        
        if ($blacklist.revokedKeys.Count -gt 0) {
            $output += "REVOKED KEYS ($($blacklist.revokedKeys.Count)):`r`n"
            foreach ($item in $blacklist.revokedKeys) {
                $bangkokTime = Convert-ToBangkokTime $item.revokedDate
                $output += "`r`nKey: $($item.key)`r`n"
                $output += "Customer: $($item.customer)`r`n"
                $output += "Reason: $($item.reason)`r`n"
                $output += "Date: $bangkokTime`r`n"
            }
        }
        
        if ($blacklist.revokedCustomers.Count -gt 0) {
            $output += "`r`n`r`nREVOKED CUSTOMERS ($($blacklist.revokedCustomers.Count)):`r`n"
            foreach ($item in $blacklist.revokedCustomers) {
                $bangkokTime = Convert-ToBangkokTime $item.revokedDate
                $output += "`r`nCustomer: $($item.customer)`r`n"
                $output += "Reason: $($item.reason)`r`n"
                $output += "Date: $bangkokTime`r`n"
            }
        }
        
        $output += "`r`n" + ("=" * 60)
        $lastUpdatedBangkok = Convert-ToBangkokTime $blacklist.lastUpdated
        $output += "`r`nLast Updated: $lastUpdatedBangkok"
        
        $statusLabel.Text = $output
        $statusLabel.ForeColor = [System.Drawing.Color]::Black
    }
    catch {
        $statusLabel.Text = "[ERROR] Failed to load blacklist:`r`n$($_.Exception.Message)"
        $statusLabel.ForeColor = [System.Drawing.Color]::Red
    }
})

# Clear Button Click Handler
$clearButton.Add_Click({
    $keyTextBox.Text = ""
    $reasonTextBox.Text = ""
    $statusLabel.Text = ""
})

# Close Button Click Handler
$closeButton.Add_Click({
    $form.Close()
})

# Show the form
[void]$form.ShowDialog()
