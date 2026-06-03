import zipfile
import xml.etree.ElementTree as ET

def read_xlsx(filename):
    with zipfile.ZipFile(filename, 'r') as z:
        # Load shared strings
        shared_strings = []
        try:
            ss_data = z.read('xl/sharedStrings.xml')
            root = ET.fromstring(ss_data)
            for si in root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                t = si.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                if t is not None:
                    shared_strings.append(t.text)
                else:
                    # check for r (rich text)
                    parts = []
                    for r in si.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}r'):
                        t_part = r.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                        if t_part is not None and t_part.text:
                            parts.append(t_part.text)
                    shared_strings.append(''.join(parts))
        except KeyError:
            pass
            
        # Load sheet1
        sheet_data = z.read('xl/worksheets/sheet1.xml')
        root = ET.fromstring(sheet_data)
        
        # We want to print cell values
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        rows = {}
        for r in root.findall('.//ns:row', ns):
            row_idx = int(r.get('r'))
            rows[row_idx] = {}
            for c in r.findall('ns:c', ns):
                cell_ref = c.get('r')
                t = c.get('t')
                v_el = c.find('ns:v', ns)
                val = ""
                if v_el is not None:
                    val = v_el.text
                    if t == 's':
                        val = shared_strings[int(val)]
                rows[row_idx][cell_ref] = val
                
        for r_idx in sorted(rows.keys()):
            row = rows[r_idx]
            row_str = []
            for c_ref in sorted(row.keys()):
                row_str.append(f"{c_ref}: {row[c_ref]}")
            print(f"Row {r_idx}: " + " | ".join(row_str))

if __name__ == '__main__':
    read_xlsx('new table.xlsx')
