# TROUBLESHOOTING

Use the local AIF CLI; it makes no network calls.

## Safety

Start with `--dry-run`, inspect `aif diff`, and resolve conflicts explicitly. AIF never modifies Applye or another project unless it is the explicit root.
