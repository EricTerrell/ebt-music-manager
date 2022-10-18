$code=@' 
[DllImport("kernel32.dll", CharSet = CharSet.Auto,SetLastError = true)]
  public static extern void SetThreadExecutionState(uint esFlags);
'@

$ste = Add-Type -memberDefinition $code -name System -namespace Win32 -passThru

$ES_CONTINUOUS = [uint32]"0x80000000" 
$ES_AWAYMODE_REQUIRED = [uint32]"0x00000040" 
$ES_DISPLAY_REQUIRED = [uint32]"0x00000002"
$ES_SYSTEM_REQUIRED = [uint32]"0x00000001"

Write-Output "SetThreadExecutionState"

$ste::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED)

Write-Output "Sleep"

$process_id = [System.Diagnostics.Process]::GetCurrentProcess().Id;

while ($true) {
    Write-Output "preventSleep.ps: pid: $process_id"

    Start-Sleep -Seconds 86400
}

Write-Output "Stop"
